import os
import dj_database_url
from decouple import config
from .settings import *

# Production settings
DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='django-insecure-6-*5^vn8r*%+@kiev%+__r!+(88=6j2*7xxt+i_bwwhb$2cth=')

# Railway provides DATABASE_URL automatically
DATABASES = {
    'default': dj_database_url.parse(config('DATABASE_URL'))
}

# Allowed hosts
ALLOWED_HOSTS = [
    config('RAILWAY_STATIC_URL', default='localhost'),
    config('RAILWAY_PUBLIC_DOMAIN', default='localhost'),
    '.railway.app',
    '.up.railway.app',
]

# Static files with WhiteNoise
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# CORS for production
CORS_ALLOWED_ORIGINS = [
    config('FRONTEND_URL', default='https://your-app.netlify.app'),
]
CORS_ALLOW_ALL_ORIGINS = False

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True