from celery import shared_task
from flask import current_app
from models import *
from datetime import datetime, timedelta
from flask_security import current_user
from io import StringIO
from mail import send_email
from flask import render_template
from datetime import datetime
import csv
import os
import requests
import json


@shared_task(ignore_results=False, name = 'csv_report')
def csv_report(user_id=None):
    with current_app.app_context():
            user = User.query.get(user_id)
            if not user:
                return None
            #print(user_id)
            transactions = Transaction.query.filter(Transaction.status == 'active').all()
            legacy_transactions = LegacyTransaction.query.filter_by(user_id=str(user.id)).all()
            all_transactions = transactions + legacy_transactions
            #print(transactions)
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow([
                'Transaction ID', 'Date', 'Start Time', 'End Time',
                'Lot ID', 'Spot ID', 'Vehicle ID', 'Amount', 'Status'
            ])

            for t in all_transactions:
                writer.writerow([
                    t.id,
                    t.start_time.strftime('%Y-%m-%d') if t.start_time else '',
                    t.start_time.strftime('%H:%M:%S') if t.start_time else '',
                    t.end_time.strftime('%H:%M:%S') if hasattr(t, 'end_time') and t.end_time else '',
                    t.lot_id,
                    t.spot_id,
                    t.vehicle_id,
                    t.amount if hasattr(t, 'amount') else '',
                    t.status if hasattr(t, 'status') else 'completed'
                ])

            csv_data = output.getvalue()
            export_dir = os.path.join(current_app.root_path, 'static', 'exports')
            os.makedirs(export_dir, exist_ok=True)
            file_path = os.path.join(export_dir, f'parking_transactions_{user.id}.csv')
            with open(file_path, 'w', newline='') as f:
                f.write(csv_data)
            output.close()

            filename = f'parking_transactions_{user.id}.csv'
            return filename

@shared_task(ignore_results=False, name='monthly_report')
def monthly_report():
    with current_app.app_context():
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        last_month = first_day_of_month - timedelta(days=1)
        
        users = User.query.all()
        
        for user in users:
            transactions = Transaction.query.filter(
                Transaction.user_id == user.id,
                Transaction.start_time >= last_month.replace(day=1),
                Transaction.start_time < first_day_of_month,
                Transaction.status == 'active'
            ).all()
            
            legacy_transactions = LegacyTransaction.query.filter(
                LegacyTransaction.user_id == str(user.id),
                LegacyTransaction.start_time >= last_month.replace(day=1),
                LegacyTransaction.start_time < first_day_of_month
            ).all()
            
            all_transactions = transactions + legacy_transactions
            
            if not all_transactions:
                continue  # Skip users with no activity
                
            for t in all_transactions:
                t.display_registration = (
                    t.vehicle.registration_no
                    if hasattr(t, 'vehicle') and t.vehicle
                    else t.vehicle_registration
                )

            for t in all_transactions:
                t.address = Lot.query.get(t.lot_id).address
                #print(t.address)

            total_bookings = len(all_transactions)
            total_spent = sum(t.amount for t in all_transactions if t.amount)
            
            lot_usage = {}
            for t in all_transactions:
                lot_usage[t.lot_id] = lot_usage.get(t.lot_id, 0) + 1
            most_used_lot_id = max(lot_usage.items(), key=lambda x: x[1])[0] if lot_usage else None
            most_used_lot = Lot.query.get(most_used_lot_id).address if most_used_lot_id else "None"
            
            for t in all_transactions:
                if hasattr(t, 'end_time') and t.end_time:
                    duration = t.end_time - t.start_time
                    hours = duration.seconds // 3600
                    minutes = (duration.seconds % 3600) // 60
                    t.duration_str = f"{hours}h {minutes}m"
                else:
                    t.duration_str = "Ongoing"
            
            html_content = render_template(
                'mail_details.html',
                user=user,
                month=last_month.strftime("%B %Y"),
                total_bookings=total_bookings,
                total_spent=total_spent,
                most_used_lot=most_used_lot,
                transactions=all_transactions
            )
            
            try:
                send_email(
                    to_address=user.email,
                    subject=f"Your {last_month.strftime('%B %Y')} Parking Report",
                    message=html_content,
                    content="html"
                )
            except Exception as e:
                current_app.logger.error(f"Failed to send monthly report to {user.email}: {str(e)}")
        
        return f"Generated monthly reports for {len(users)} users"

@shared_task(ignore_results=False, name='daily_reminder')
def daily_reminder():
    with current_app.app_context():
        cutoff_time = datetime.now() - timedelta(days=1)
        
        # Option 1: Users with no transactions at all
        inactive_users = User.query.filter(
            ~User.id.in_(db.session.query(Transaction.user_id))
        ).all()
        
        # Option 2: Users with no recent transactions
        recent_users = db.session.query(Transaction.user_id).filter(
            Transaction.start_time >= cutoff_time
        ).distinct()
        inactive_users.extend(
            User.query.filter(
                ~User.id.in_(recent_users),
                User.id.notin_([u.id for u in inactive_users])
            ).all()
        )

        for user in inactive_users:
            message = f"Hi {user.first_name}, you haven't booked a parking spot recently. Don't forget to book if you need parking!"
            try:
                send_email(
                    to_address=user.email,
                    subject="Daily Parking Reminder",
                    message=message,
                    content="plain"
                )
            except Exception as e:
                current_app.logger.error(f"Failed to send email to {user.email}: {str(e)}")

        return f"Sent reminders to {len(inactive_users)} users"