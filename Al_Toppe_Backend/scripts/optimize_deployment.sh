# AL-TOPPE Deployment Optimization Script
# Run this on your VPS server

#!/bin/bash

echo "🚀 AL-TOPPE Deployment Optimization"

# 1. Switch to production environment
export DJANGO_ENV=production

# 2. Backup current database
echo "📦 Creating backup..."
python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json

# 3. Update environment variables
echo "🔧 Setting up environment..."
cp .env.production.example .env
echo "⚠️  Please edit .env file with your actual values!"

# 4. Install production requirements
echo "📥 Installing requirements..."
pip install -r requirements.prod.txt

# 5. Run migrations
echo "🗄️  Running migrations..."
python manage.py migrate

# 6. Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# 7. Create superuser (optional)
echo "👤 Creating superuser..."
python manage.py shell -c "
from apps.accounts.models import User
if not User.objects.filter(phone='admin').exists():
    User.objects.create_superuser(phone='admin', password='admin123')
    print('✅ Superuser created: admin/admin123')
else:
    print('ℹ️  Superuser already exists')
"

# 8. Test configuration
echo "🧪 Testing configuration..."
python manage.py check --deploy

# 9. Restart services
echo "🔄 Restarting services..."
sudo systemctl restart al-toppe
sudo systemctl restart nginx

echo "✅ Deployment optimization complete!"
echo "🌐 Your API is available at: http://72.60.189.237/api/docs"