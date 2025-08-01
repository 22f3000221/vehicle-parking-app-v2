from celery import Celery, Task
from flask import Flask

def celery_init_app(app: Flask):
    class FlaskTask(Task):
        def __call__(self, *args: object, **kwargs: object):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object('celery_config')
    celery_app.set_default()
    app.extensions["celery"] = celery_app
    return celery_app