from flask_restful import Api, Resource, reqparse
from models import *
from flask_security import auth_required, roles_required, roles_accepted, current_user
from flask import jsonify
from datetime import datetime
date_format = "%Y-%m-%d %H:%M:%S"
from database import db

api = Api()

def roles_list(roles):
    roles_list = []
    for role in roles:
        roles_list.append(role.name)
    return roles_list

parser = reqparse.RequestParser()
parser.add_argument('user_id')
parser.add_argument('vehicle_id')
parser.add_argument('lot_id')
parser.add_argument('spot_id')
parser.add_argument('start_time')
parser.add_argument('end_time')

class TransApi(Resource):

    @auth_required('token')
    @roles_accepted('user', 'admin')
    def get(self):
        trans_jsons = []

        # --- Active transactions ---
        if 'admin' in roles_list(current_user.roles):
            active_transactions = Transaction.query.filter_by(status='active').all()
        else:
            active_transactions = Transaction.query.filter_by(user_id=current_user.id, status='active').all()

        for t in active_transactions:
            trans_jsons.append({
                'id': t.id,
                'status': t.status,
                'amount': t.amount,
                'user': t.user.username,
                'vehicle_id': t.vehicle_id,
                'lot_id': t.lot_id,
                'lot': t.lot.address,
                'spot': t.spot.spot_id,
                'start_time': str(t.start_time),
                'end_time': str(t.end_time) if t.end_time else None
            })

        # --- Completed transactions from legacy ---
        legacy_transactions = LegacyTransaction.query.filter_by(user_id=current_user.id).all()

        for lt in legacy_transactions:
            trans_jsons.append({
                'id': lt.id,
                'status': lt.status,
                'amount': lt.amount,
                'user': lt.username,
                'vehicle_id': lt.vehicle_id,
                'vehicle_label': lt.vehicle_label,
                'vehicle_registration': lt.vehicle_registration,
                'lot_id': lt.lot_id,
                'lot': lt.lot_id,  
                'spot': lt.spot_id,
                'start_time': str(lt.start_time),
                'end_time': str(lt.end_time),
                'rate': lt.rate
            })

        if trans_jsons:
            return trans_jsons, 200

        return {"message": "no transactions found"}, 400
    
    @auth_required('token')
    @roles_required('user')
    def post(self):
        args = parser.parse_args()

        active_txn = Transaction.query.filter_by(vehicle_id=args['vehicle_id'], status='active').first()
        if active_txn:
            return {
                "message":"vehicle already parked"
            },400

        try:
            transaction = Transaction(user_id=current_user.id,
                                      vehicle_id=args['vehicle_id'],
                                      spot_id=args['spot_id'],
                                      lot_id=args['lot_id'],
                                      start_time=datetime.now(),
                                      end_time=None,
                                      amount=-1,
                                      status='active')
            
            spot = Spot.query.get(args['spot_id'])
            if spot:
                spot.occupied='occupied'
            else:
                print("spot id is null")
            db.session.add(transaction)
            db.session.commit()
            return {
                "message":"transaction created"
            },200
        except Exception as e:
            print(e)
            return{
                "message":"missing fields"
            },400

    @auth_required('token')
    @roles_required('user')
    def put(self, trans_id):
        args = parser.parse_args()
        
        try:
            trans = Transaction.query.get(trans_id)
            lot = db.session.get(Lot,trans.lot_id)
            if not trans:
                return {"message": "Transaction not found"}, 404

            trans.status = 'completed'
            trans.end_time = datetime.now()

            duration = trans.end_time - trans.start_time
            hours = duration.total_seconds() / 3600
            rounded_hours = max(1, round(hours))
            trans.amount = int(lot.rate)*rounded_hours

            spot = Spot.query.get(args['spot_id'])
            if spot:
                spot.occupied = 'released'
            else:
                return {"message": "Spot not found"}, 400

            db.session.commit()

            vehicle = Vehicle.query.get(trans.vehicle_id)
            legacy = LegacyTransaction(user_id=trans.user_id,
                            username=current_user.username,
                            vehicle_id=trans.vehicle_id,
                            vehicle_label=vehicle.label,
                            vehicle_registration=vehicle.registration_no,
                            lot_id=trans.lot_id,
                            spot_id=trans.spot_id,
                            start_time=trans.start_time,
                            end_time=trans.end_time,
                            rate = lot.rate,
                            amount=trans.amount)
            db.session.add(legacy)
            db.session.commit()

            return {"message": "Transaction updated and spot released"}, 200

        except Exception as e:
            print(e)
            return {"message": "Failed to update transaction"}, 400





    @auth_required('token')
    @roles_required('user')
    def delete(self, trans_id):
        trans = Transaction.query.get(id=trans_id)
        if trans:
            db.session.delete(trans)
            db.session.commit() 
            return {
                "message":"transaction deleted"
            },200
        else:
            return{
                "message":"transaction does not exist"
            },404



api.add_resource(TransApi, '/api/get', '/api/create', '/api/update/<trans_id>', '/api/delete/<trans_id>')
