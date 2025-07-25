from flask import current_app as app
from flask_security import auth_required, roles_required, roles_accepted, current_user, hash_password, verify_password, login_user
from flask import jsonify, request, render_template
from models import *
from database import db
from datetime import datetime,timedelta
from collections import defaultdict
from celery.result import AsyncResult
from tasks import *
from flask import send_from_directory

"""@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')"""

@app.route('/', methods=['GET'])
def home():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def user_login():
    body = request.get_json()
    email = body['email']
    password = body['password']

    if not email:
        return jsonify({
            "message":"email is required"
        })
    
    user = app.security.datastore.find_user(email=email)

    if user:
        if verify_password(password, user.password):
            login_user(user)
            return jsonify({
                "id":user.id,
                "username":user.username,
                "auth-token":user.get_auth_token(),
                "roles":[role.name for role in user.roles]
            }),200
        else:
            return jsonify({
                "message":"password incorrect"
            }),400
    else:
        return jsonify({
            "message":"user not found"
        }),400


@app.route('/api/admin')
@auth_required('token')
@roles_required('admin')
def admin_dashboard():
    admin = current_user
    return jsonify({
        "username": admin.username,
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name
    })



@app.route('/api/home')
@auth_required('token')
@roles_accepted('user','admin')
def user_dashboard():
    user = current_user
    return jsonify({
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name
    })

@app.route('/api/register', methods=['POST'])
def create_user():
    cred = request.get_json()
    if not app.security.datastore.find_user(email=cred['email']):
        if not app.security.datastore.find_user(username=cred['username']):
            app.security.datastore.create_user(first_name=cred['first_name'],
                                               last_name=cred['last_name'],
                                               username=cred['username'],
                                               email=cred['email'],
                                               password=hash_password(cred['password']),
                                               license_no=cred['license'],
                                               roles = ['user'])
            db.session.commit()
            return jsonify({
                'message':'user created succesfully'
            }),201
        return jsonify({
            'message':'user already exists'
        }),400
    
@app.route('/api/pay/<int:trans_id>')
@auth_required('token')
@roles_required('user')
def payment(trans_id):
    trans = Transaction.query.get(trans_id)
    trans.status = 'completed'
    db.session.commit()
    return jsonify({
        "message":"payment successful"
    })

"""
@app.route('/api/review/<int:trans_id>')
@auth_required('token')
@roles_required('user')
def review(trans_id):
    trans = Transaction.query.get(trans_id)
    body = request.get_json
"""

@app.route('/api/lots/search', methods=['GET'])
@auth_required('token')
@roles_accepted('user', 'admin')
def search_lots():
    address = request.args.get('address', '').lower()
    city = request.args.get('city', '').lower()
    pincode = request.args.get('pincode', '').lower()

    query = Lot.query.filter_by(active=True)

    if address:
        query = query.filter(Lot.address.ilike(f"%{address}%"))
    if city:
        query = query.filter(Lot.city.ilike(f"%{city}%"))
    if pincode:
        query = query.filter(Lot.pincode.ilike(f"%{pincode}%"))

    lots = query.all()

    return jsonify([
        {
            "lot_id": lot.lot_id,
            "address": lot.address,
            "city": lot.city,
            "pincode": lot.pincode,
            "rate": lot.rate,
            "active": lot.active
        }
        for lot in lots
    ])

@app.route('/api/lots/<int:lot_id>/spots/available', methods=['GET'])
@auth_required('token')
@roles_required('user')
def get_available_spot(lot_id):
    spot = Spot.query.filter_by(lot_id=lot_id, occupied='released').first()

    if spot:
        return jsonify({ "spot_id": spot.spot_id })

    return jsonify({ "message": "No available spots found" }), 404

@app.route('/api/vehicles', methods=['GET'])
@auth_required('token')
@roles_required('user')
def get_vehicles():
    vehicles = current_user.vehicles
    return jsonify([
        {
            "vehicle_id": v.vehicle_id,
            "registration_no": v.registration_no,
            "label": v.label
        } for v in vehicles
    ])

@app.route('/api/vehicles', methods=['POST'])
@auth_required('token')
@roles_required('user')
def add_vehicle():
    data = request.get_json()
    reg_no = data.get('registration_no', '').upper().strip()  
    label = data.get('label')
    
    if not reg_no:
        return jsonify({"message": "registration_no required"}), 400
        
    import re
    if not re.match(r'^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$', reg_no):
        return jsonify({
            "message": "Invalid registration number format. Please use format: XX00XX0000 (2 letters, 2 numbers, 2 letters, 4 numbers)"
        }), 400

    if Vehicle.query.filter_by(registration_no=reg_no).first():
        return jsonify({"message": "Vehicle already exists"}), 400

    new_vehicle = Vehicle(registration_no=reg_no, user_id=current_user.id, label=label)
    db.session.add(new_vehicle)
    db.session.commit()

    return jsonify({"message": "Vehicle added successfully",
                    "id": new_vehicle.vehicle_id})

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
@auth_required('token')
@roles_required('user')
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle or vehicle.owner != current_user:
        return jsonify({"message": "Vehicle not found or unauthorized"}), 404

    active_txn = Transaction.query.filter_by(
        vehicle_id=vehicle.vehicle_id,
        status='active'
    ).first()

    if active_txn:
        return jsonify({"message": "Cannot delete: Vehicle is part of an active booking."}), 400

    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle removed"}), 200

@app.route('/api/user/summary', methods=['GET'])
@auth_required('token')
@roles_required('user')
def get_user_summary():
    user = current_user
    transactions = Transaction.query.filter_by(user_id=user.id, status='active').all()
    legacy_transactions = LegacyTransaction.query.filter_by(user_id=user.id).all()

    all_transactions = transactions + legacy_transactions

    vehicle_id_to_label = {}
    for v in user.vehicles:
        label = v.label or v.registration_no or f"Vehicle {v.vehicle_id}"
        vehicle_id_to_label[v.vehicle_id] = label

    vehicle_stats = defaultdict(lambda: {"count": 0, "amount": 0, "time_spent": 0})
    weekly_stats = defaultdict(int)

    total_amount = 0
    total_time = 0
    total_bookings = len(all_transactions)
    active_bookings = sum(1 for t in transactions if t.status == 'active')

    now = datetime.now()

    for t in all_transactions:
        vehicle_id = t.vehicle_id
        amount = t.amount or 0
        start = t.start_time
        end = t.end_time or now
        duration = (end - start).total_seconds() / 3600  # in hours

        total_amount += amount
        total_time += duration

        label = vehicle_id_to_label.get(vehicle_id, f"Vehicle {vehicle_id}")
        vehicle_stats[label]["count"] += 1
        vehicle_stats[label]["amount"] += amount
        vehicle_stats[label]["time_spent"] += duration

        week = (end - timedelta(days=end.weekday())).strftime("%Y-%m-%d")
        weekly_stats[week] += 1

    def top_vehicles(key):
        return sorted(vehicle_stats.items(), key=lambda x: x[1][key], reverse=True)[:5]

    return jsonify({
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "total_amount": total_amount,
        "average_amount": total_amount / total_bookings if total_bookings else 0,
        "total_time_hours": total_time,
        "average_time_hours": total_time / total_bookings if total_bookings else 0,
        "top_used_vehicles": top_vehicles("count"),
        "top_spending_vehicles": top_vehicles("amount"),
        "weekly_bookings": weekly_stats
    })

@app.route('/api/admin/performance', methods=['GET'])
@auth_required('token')
@roles_required('admin')
def admin_performance():
    result = {}

    #transactions = Transaction.query.all()
    legacy_transactions = LegacyTransaction.query.all()
    transactions = Transaction.query.filter_by(status='active').all()
    all_transactions = transactions + legacy_transactions

    total_bookings = len(all_transactions)
    active_bookings = sum(1 for t in transactions if t.status == 'active')
    result['total_bookings'] = total_bookings
    result['active_bookings'] = active_bookings

    amounts = [t.amount for t in all_transactions if t.amount is not None]
    total_amount = sum(amounts)
    avg_amount = round(total_amount / len(amounts), 2) if amounts else 0
    result['total_amount_spent'] = total_amount
    result['average_amount_spent'] = avg_amount

    durations = []
    for t in all_transactions:
        if t.start_time and t.end_time:
            durations.append((t.end_time - t.start_time).total_seconds() / 60)

    total_time = round(sum(durations), 2)
    avg_time = round(total_time / len(durations), 2) if durations else 0
    result['total_time_spent_mins'] = total_time
    result['average_time_spent_mins'] = avg_time

    vehicle_usage = defaultdict(int)
    for t in all_transactions:
        vehicle_usage[t.vehicle_id] += 1

    top_vehicles_usage = sorted(vehicle_usage.items(), key=lambda x: x[1], reverse=True)[:5]
    result['top_vehicles_by_usage'] = [
        {'vehicle_id': v_id, 'count': count} for v_id, count in top_vehicles_usage
    ]

    vehicle_spending = defaultdict(float)
    for t in all_transactions:
        if t.amount:
            vehicle_spending[t.vehicle_id] += t.amount

    top_vehicles_spending = sorted(vehicle_spending.items(), key=lambda x: x[1], reverse=True)[:5]
    result['top_vehicles_by_spending'] = [
        {'vehicle_id': v_id, 'amount': amt} for v_id, amt in top_vehicles_spending
    ]

    today = datetime.now()
    four_weeks_ago = today - timedelta(weeks=4)
    weekly_counts = [0, 0, 0, 0]  # week 0 is oldest, week 3 is most recent

    for t in all_transactions:
        if t.start_time and t.start_time >= four_weeks_ago:
            days_ago = (today - t.start_time).days
            week_index = days_ago // 7
            if 0 <= week_index < 4:
                weekly_counts[3 - week_index] += 1

    result['weekly_bookings_last_4_weeks'] = weekly_counts

    lot_stats = defaultdict(lambda: {'count': 0, 'revenue': 0.0})

    for t in all_transactions:
        lot_stats[t.lot_id]['count'] += 1
        if t.amount:
            lot_stats[t.lot_id]['revenue'] += t.amount

    top_lots = sorted(lot_stats.items(), key=lambda x: x[1]['revenue'], reverse=True)[:5]
    top_lot_data = []

    for lot_id, data in top_lots:
        lot = Lot.query.filter_by(lot_id=lot_id).first()
        if lot:
            top_lot_data.append({
                'lot_id': lot.lot_id,
                'address': lot.address,
                'total_bookings': data['count'],
                'total_revenue': round(data['revenue'], 2)
            })

    result['top_performing_lots'] = top_lot_data

    return jsonify(result)

@app.route('/api/admin/users', methods=['GET'])
@auth_required('token')
@roles_required('admin')
def get_users():
    user_id = request.args.get('id')
    username = request.args.get('username')
    email = request.args.get('email')
    vehicle_reg = request.args.get('vehicle_registration')

    filters_applied = any([user_id, username, email, vehicle_reg])
    users = []

    if vehicle_reg:
        vehicle = Vehicle.query.filter(Vehicle.registration_no.ilike(f"%{vehicle_reg}%")).all()
        if vehicle:
            users = [v.owner for v in vehicle]
        else:
            return jsonify([])

    elif user_id:
        user = User.query.filter_by(id=user_id).first()
        if user:
            users = [user]
        else:
            return jsonify([])

    elif username:
        user = User.query.filter(User.username.ilike(f"%{username}%")).all()
        if user:
            users = user
        else:
            return jsonify([])

    elif email:
        users = User.query.filter(User.email.ilike(f"%{email}%")).all()
    
    else:
        users = User.query.all()

    result = []
    for user in users:
        user_data = {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "license_no": user.license_no,
            "active": user.active,
            "roles": [r.name for r in user.roles],
            "vehicles": [
                {
                    "vehicle_id": v.vehicle_id,
                    "registration_no": v.registration_no,
                    "label": v.label
                } for v in user.vehicles
            ]
        }
        result.append(user_data)

    return jsonify(result)

@app.route('/api/admin/users/<int:user_id>/status', methods=['PUT'])
@auth_required('token')
@roles_required('admin')
def toggle_user_status(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json()
    active_status = data.get('active')
    if active_status is None:
        return jsonify({"message": "Missing 'active' field"}), 400

    user.active = active_status
    db.session.commit()
    return jsonify({"message": f"User {'activated' if active_status else 'deactivated'} successfully"})


@app.route('/api/admin/lots/search', methods=['GET'])
@auth_required('token')
@roles_required('admin')
def search_lots_admin():
    address = request.args.get('address', '').strip().lower()
    city = request.args.get('city', '').strip().lower()
    pincode = request.args.get('pincode', '').strip().lower()

    query = Lot.query

    if address:
        query = query.filter(Lot.address.ilike(f"%{address}%"))
    if city:
        query = query.filter(Lot.city.ilike(f"%{city}%"))
    if pincode:
        query = query.filter(Lot.pincode.ilike(f"%{pincode}%"))

    lots = query.all()

    return jsonify([
        {
            "lot_id": lot.lot_id,
            "address": lot.address,
            "city": lot.city,
            "pincode": lot.pincode,
            "active": lot.active,
            "rate": lot.rate,
            "spot_count": len(lot.spots)
        }
        for lot in lots
    ])


@app.route('/api/admin/lots/<int:lot_id>/details', methods=['GET'])
@auth_required('token')
@roles_required('admin')
def lot_details(lot_id):
    lot = Lot.query.get(lot_id)
    if not lot:
        return jsonify({"message": "Lot not found"}), 404

    spots = Spot.query.filter_by(lot_id=lot_id).all()

    spot_data = []
    for spot in spots:
        active_txn = Transaction.query.filter_by(
            spot_id=spot.spot_id, 
            status='active'
        ).first()

        spot_info = {
            "spot_id": spot.spot_id,
            "status": spot.occupied,
        }

        if active_txn:
            spot_info["user"] = active_txn.user.username
            spot_info["vehicle_registration"] = active_txn.vehicle.registration_no
            spot_info["start_time"] = active_txn.start_time.strftime("%Y-%m-%d %H:%M:%S")

        spot_data.append(spot_info)

    total_spots = len(spots)
    occupied_spots = sum(1 for s in spots if s.occupied == 'occupied')
    released_spots = total_spots - occupied_spots
    active_txns = Transaction.query.filter_by(lot_id=lot_id, status='active').count()

    return jsonify({
        "lot_id": lot.lot_id,
        "address": lot.address,
        "city": lot.city,
        "pincode": lot.pincode,
        "rate": lot.rate,
        "active": lot.active,
        "metrics": {
            "total_spots": total_spots,
            "occupied_spots": occupied_spots,
            "released_spots": released_spots,
            "active_transactions": active_txns
        },
        "spots": spot_data
    })

@app.route('/api/admin/lots/create', methods=['POST'])
@auth_required('token')
@roles_required('admin')
def create_lot():
    data = request.get_json()

    required_fields = ['address', 'city', 'pincode', 'rate', 'spot_count']
    if not all(field in data for field in required_fields):
        print("missing fields")
        return jsonify({"message": "Missing required fields"}), 400

    try:
        lot = Lot(
            address=data['address'],
            city=data['city'],
            pincode=data['pincode'],
            rate=float(data['rate']),
            active=True,
            capacity=int(data['spot_count'])
        )
        db.session.add(lot)
        db.session.commit()  
        
        for _ in range(int(data['spot_count'])):
            spot = Spot(
                lot_id=lot.lot_id,
                occupied='released'
            )
            db.session.add(spot)

        db.session.commit()

        return jsonify({
            "message": "Lot created successfully",
            "lot_id": lot.lot_id,
            "spot_count": data['spot_count']
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to create lot", "error": str(e)}), 500
    

@app.route('/api/admin/lots/<int:lot_id>/toggle_active', methods=['PUT'])
@auth_required('token')
@roles_required('admin')
def toggle_lot_active(lot_id):
    lot = Lot.query.get(lot_id)
    if not lot:
        return jsonify({"message": "Lot not found"}), 404
    lot.active = not lot.active
    db.session.commit()
    return jsonify({"message": "Lot status updated", "active": lot.active})


@app.route('/api/admin/spots/<int:spot_id>/toggle_status', methods=['PUT'])
@auth_required('token')
@roles_required('admin')
def toggle_spot_status(spot_id):
    spot = Spot.query.get(spot_id)
    if not spot:
        return jsonify({"message": "Spot not found"}), 404
    spot.occupied = 'released' if spot.occupied == 'occupied' else 'occupied'
    db.session.commit()
    return jsonify({"message": "Spot status toggled", "status": spot.occupied})




@app.route('/api/admin/lots/<int:lot_id>', methods=['DELETE'])
@auth_required('token')
@roles_required('admin')
def delete_lot(lot_id):
    lot = Lot.query.get(lot_id)
    if not lot:
        return jsonify({'message': 'Lot not found'}), 404

    unreleased_spots = Spot.query.filter_by(lot_id=lot_id, occupied='occupied').count()
    if unreleased_spots > 0:
        return jsonify({'message': 'Cannot delete lot with occupied spots'}), 400

    Transaction.query.filter_by(lot_id=lot_id).delete()
    
    Spot.query.filter_by(lot_id=lot_id).delete()

    db.session.delete(lot)
    db.session.commit()

    return jsonify({'message': 'Lot deleted successfully'}), 200

@app.route('/api/user/trigger_export', methods=['POST'])
@auth_required('token')
@roles_required('user')
def trigger_export():
    print("endpoint called trigger")
    task = csv_report.delay(current_user.id)
    
    return jsonify({
        "message": "Export started",
        "task_id": task.id
    }), 202

@app.route('/api/user/export_status/<task_id>', methods=['GET'])
@auth_required('token')
@roles_required('user')
def export_status(task_id):
    print("endpoint called status")
    task = AsyncResult(task_id)
    
    response = {
        "task_id": task.id,
        "status": task.status,
        "result": task.result if task.ready() else None
    }
    
    if task.status == 'FAILURE':
        response['error'] = str(task.result)
    
    return jsonify(response)

@app.route('/api/user/download_export/<filename>', methods=['GET'])
@auth_required('token')
@roles_required('user')
def download_export(filename):
    print("endpoint called download")
    try:
        return send_from_directory(
            os.path.join(app.root_path, 'static', 'exports'),
            filename,
            as_attachment=True
        )
    except FileNotFoundError:
        return jsonify({"message": "File not found"}), 404


