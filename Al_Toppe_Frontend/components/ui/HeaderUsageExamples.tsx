// Example usage of the Header component in different screens

// 1. In a screen with title and back button
<Header 
  title="Mon Profil"
  showBackButton={true}
  onBackPress={() => router.back()}
  showNotifications={true}
  notificationCount={5}
/>

// 2. In the main dashboard (as we added to index.tsx)
<Header 
  title="Tableau de bord"
  notificationCount={dashboardData.alerts}
  onNotificationPress={() => navigation.navigate('alerts')}
  onProfilePress={() => navigation.navigate('profile')}
/>

// 3. In a transparent header (for screens with background images)
<Header 
  transparent={true}
  showNotifications={true}
  showLanguage={true}
  showProfile={true}
/>

// 4. Minimal header with just language selector
<Header 
  showNotifications={false}
  showProfile={false}
  showLanguage={true}
/>

// The Header component features:
// ✅ AL-TOPPE logo with mini version
// ✅ Notification bell with badge count
// ✅ Language selector (French, Wolof, English)
// ✅ User profile avatar
// ✅ Transparent mode for overlay
// ✅ Customizable title and back button
// ✅ Safe area support for different devices