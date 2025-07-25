from flask import Flask
from database import db
from models import *
from config import localDevelopmentConfig
from flask_security import Security, SQLAlchemyUserDatastore, hash_password
from resources import api
import random
from datetime import datetime, timedelta
from celery_init import celery_init_app
from celery.schedules import crontab

def createApp():
    app = Flask(__name__)
    app.config.from_object(localDevelopmentConfig)
    db.init_app(app)
    api.init_app(app)
    datastore = SQLAlchemyUserDatastore(db, User, Role)
    app.security = Security(app, datastore)
    app.app_context().push()
    return app

app = createApp()
celery = celery_init_app(app)
celery.autodiscover_tasks()

def create_users():
    users = [
        {"first_name": "Alice", "last_name": "Johnson", "username": "alicej", "email": "alice@example.com", "license_no": "DL12345678"},
        {"first_name": "Bob", "last_name": "Smith", "username": "bobsmith", "email": "bob@example.com", "license_no": "MH98765432"},
        {"first_name": "Charlie", "last_name": "Davis", "username": "charlied", "email": "charlie@example.com", "license_no": "KA11223344"},
        {"first_name": "Diana", "last_name": "Reed", "username": "dianar", "email": "diana@example.com", "license_no": "TN55566677"},
        {"first_name": "Ethan", "last_name": "Wright", "username": "ethanw", "email": "ethan@example.com", "license_no": "GJ99988877"},
    ]

    for user in users:
        app.security.datastore.create_user(
            first_name=user["first_name"],
            last_name=user["last_name"],
            username=user["username"],
            email=user["email"],
            password=hash_password("testpassword"),
            license_no=user["license_no"],
            roles=['user']
        )
    db.session.commit()

def create_vehicles():
    vehicle_labels = ["Sedan", "SUV", "Bike", "Hatchback", "Scooter", "Coupe"]
    reg_states = ["KA", "MH", "DL", "TN", "GJ"]
    vehicles = []

    for user_id in range(3, 8):  # Assuming user IDs start at 3
        num_vehicles = random.randint(5,7)
        for i in range(num_vehicles):
            state = random.choice(reg_states)
            reg_no = f"{state}{random.randint(10,99)}{chr(random.randint(65,90))}{chr(random.randint(65,90))}{random.randint(1000,9999)}"
            label = f"User{user_id}'s {random.choice(vehicle_labels)}"
            vehicles.append(Vehicle(
                registration_no=reg_no,
                user_id=user_id,
                label=label
            ))

    db.session.add_all(vehicles)
    db.session.commit()

def create_lots_and_spots():
    city_data = [
        ("123 MG Road", "Bangalore", "560001", 30.0),
        ("45 Marine Drive", "Mumbai", "400001", 50.0),
        ("22 Connaught Place", "Delhi", "110001", 40.0),
        ("7 Anna Salai", "Chennai", "600002", 35.0),
        ("99 SG Highway", "Ahmedabad", "380015", 25.0),
    ]
    
    lots = []
    for address, city, pincode, rate in city_data:
        lot = Lot(
            address=address,
            city=city,
            pincode=pincode,
            active=True,
            rate=rate,
            capacity=10
        )
        lots.append(lot)
    
    db.session.add_all(lots)
    db.session.commit()

    for lot in lots:
        for _ in range(10):
            spot = Spot(
                lot_id=lot.lot_id,
                occupied='released'
            )
            db.session.add(spot)

    db.session.commit()

def create_transactions_with_legacy():
    now = datetime.now()
    start_week = now - timedelta(weeks=7)

    vehicles_by_user = {}
    vehicles = Vehicle.query.all()
    for v in vehicles:
        vehicles_by_user.setdefault(v.user_id, []).append(v)

    for user_id, user_vehicles in vehicles_by_user.items():
        user = db.session.get(User, user_id)
        if not user:
            continue

        num_tx = random.randint(20, 30)
        for _ in range(num_tx):
            vehicle = random.choice(user_vehicles)
            spot_id = random.randint(1, 50)
            lot_id = ((spot_id - 1) // 10) + 1
            spot = db.session.get(Spot, spot_id)
            lot = db.session.get(Lot, lot_id)

            # Time spread within 7 weeks
            days_ago = random.randint(0, 49)
            hours_offset = random.randint(0, 23)
            duration_hours = random.randint(1, 6)
            start_time = now - timedelta(days=days_ago, hours=hours_offset)
            end_time = start_time + timedelta(hours=duration_hours)
            rate = lot.rate if lot else 40.0
            amount = duration_hours * rate

            tx = Transaction(
                user_id=user.id,
                vehicle_id=vehicle.vehicle_id,
                spot_id=spot_id,
                lot_id=lot_id,
                start_time=start_time,
                end_time=end_time,
                amount=amount,
                status='completed'
            )
            db.session.add(tx)

            legacy_tx = LegacyTransaction(
                user_id=str(user.id),
                username=user.username,
                vehicle_id=str(vehicle.vehicle_id),
                vehicle_label=vehicle.label or "N/A",
                vehicle_registration=vehicle.registration_no,
                spot_id=str(spot_id),
                lot_id=str(lot_id),
                start_time=start_time,
                end_time=end_time,
                amount=amount,
                status='completed',
                rate=rate
            )
            db.session.add(legacy_tx)

    db.session.commit()

with app.app_context():
    db.drop_all()
    db.create_all()

    app.security.datastore.find_or_create_role(name="admin", description="superuser")
    app.security.datastore.find_or_create_role(name="user", description="genuser")
    #app.security.datastore.find_or_create_role(name="user awaiting approval", description="approval required")
    db.session.commit()

    if not app.security.datastore.find_user(email='user0@admin.com'):
        app.security.datastore.create_user(first_name='admin',
                                           last_name='admin',
                                           username='admin',
                                           email='user0@admin.com',
                                           password=hash_password('admin_password'),
                                           license_no='admin_license',
                                           roles = ['admin'])

    if not app.security.datastore.find_user(email='user1@user.com'):
        app.security.datastore.create_user(first_name='test',
                                           last_name='user',
                                           username='test_user',
                                           email='user1@user.com',
                                           password=hash_password('user_password'),
                                           license_no='user_license',
                                           roles=['user'])
    db.session.commit()
    create_users()
    create_vehicles()
    create_lots_and_spots()
    create_transactions_with_legacy()

    

from routes import *

@celery.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    # Daily reminder at 6 PM (18:00)
    sender.add_periodic_task(
        #crontab(hour=18, minute=0),
        timedelta(seconds=30),
        daily_reminder.s(),
        name='send-daily-reminders'
    )
    
    # Monthly report on 1st day of month at 9 AM
    sender.add_periodic_task(
        #crontab(day_of_month=1, hour=9, minute=0),
        timedelta(seconds=30),
        monthly_report.s(),
        name='send-monthly-reports'
    )

if __name__ == "__main__":
    app.run()