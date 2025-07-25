from database import db
from flask_security import UserMixin, RoleMixin

class Role(db.Model,RoleMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, unique=True, nullable=False)
    description = db.Column(db.String)

class UserRoles(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('user.id'))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String, nullable=True)
    last_name = db.Column(db.String, nullable=True)
    username = db.Column(db.String, unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    license_no = db.Column(db.String, nullable=False)
    fs_uniquifier = db.Column(db.String, unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)
    roles = db.relationship('Role', backref='bearer', secondary='user_roles')
    vehicles = db.relationship('Vehicle', backref='owner', cascade='all, delete-orphan')

class Vehicle(db.Model):
    vehicle_id = db.Column(db.Integer, primary_key=True)
    registration_no = db.Column(db.String, unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    label = db.Column(db.String, nullable=True)
    transactions = db.relationship('Transaction', back_populates='vehicle', cascade='all, delete-orphan', passive_deletes=True)

class Lot(db.Model):
    lot_id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.String, nullable=False)
    city = db.Column(db.String, nullable=False)
    pincode = db.Column(db.String, nullable=False)
    active = db.Column(db.Boolean, nullable=False)
    rate = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    spots = db.relationship('Spot', backref='lot_obj', cascade='all, delete-orphan')

class Spot(db.Model):

    spot_id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.String, db.ForeignKey('lot.lot_id'))
    occupied = db.Column(db.String, nullable=False)
    
class Transaction(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    vehicle_id = db.Column(db.String, db.ForeignKey('vehicle.vehicle_id'), nullable=False)
    spot_id = db.Column(db.String, db.ForeignKey('spot.spot_id'), nullable=False)
    lot_id = db.Column(db.String, db.ForeignKey('lot.lot_id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    amount = db.Column(db.Float, nullable=True)
    status = db.Column(db.String, nullable=False)
    user = db.relationship('User', backref=db.backref('transactions', cascade='all, delete-orphan'))
    vehicle = db.relationship('Vehicle', back_populates='transactions')
    spot = db.relationship('Spot', backref='transactions')
    lot = db.relationship('Lot', backref='transactions')

class LegacyTransaction(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, nullable=False)
    username = db.Column(db.String, nullable=False)
    vehicle_id = db.Column(db.String, nullable=False)
    vehicle_label = db.Column(db.String, nullable=False)
    vehicle_registration = db.Column(db.String, nullable=False)
    spot_id = db.Column(db.String, nullable=False)
    lot_id = db.Column(db.String, nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    rate = db.Column(db.Float, nullable=False)
    status = db.Column(db.String, default='completed')    