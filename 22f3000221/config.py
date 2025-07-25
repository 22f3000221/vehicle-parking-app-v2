class Config():
    DEBUG = False
    SQLALCHEMY_TRACK_MODIFICATIONS = True

class localDevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///lmsv2.sqlite3"
    DEBUG = True

    SECRET_KEY =  "secret-key"
    SECURITY_PASSWORD_HASH = "bcrypt"
    SECURITY_PASSWORD_SALT = "salt-key"
    WTF_CSRF_ENABLED = False
    SECURITY_TOKEN_AUTHENTICATION_HEADER = "authentication-token"
