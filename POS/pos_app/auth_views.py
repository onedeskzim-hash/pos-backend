from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"Login attempt - Username: {username}")
        
        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(request, username=username, password=password)
        print(f"Authentication result: {'Success' if user else 'Failed'}")
        
        if user is not None:
            if user.is_active:
                # Use both session and token authentication
                login(request, user)
                
                # Create or get token
                token, created = Token.objects.get_or_create(user=user)
                
                return Response({
                    'success': True,
                    'token': token.key,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser,
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Account is disabled'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'error': 'Invalid username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        print(f"Login error occurred")
        import traceback
        traceback.print_exc()
        return Response({
            'error': f'Login failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    try:
        # Delete the user's token if authenticated
        if request.user.is_authenticated:
            try:
                request.user.auth_token.delete()
            except:
                pass
        return Response({
            'message': 'Successfully logged out'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'message': 'Logout completed'
        }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    try:
        user = request.user
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to get user data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)