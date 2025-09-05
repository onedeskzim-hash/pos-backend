from django.apps import AppConfig


class PosAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pos_app'
    verbose_name = 'GiveSolar-POS'

    def ready(self):
        import pos_app.signals
