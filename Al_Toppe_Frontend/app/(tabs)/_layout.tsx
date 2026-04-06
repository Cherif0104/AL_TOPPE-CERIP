import { Tabs } from "expo-router";
import { Home, DollarSign, BarChart3, Mic, UserSquare2, FileTextIcon } from "lucide-react-native";
import Colors from "@/constants/colors";
import Typography from "@/constants/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ui/ProtectedRoute";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AuthProvider> 
<ProtectedRoute>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.gray500,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 56 + insets.bottom, // 👈 ajoute marge si besoin
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8, // 👈 évite le chevauchement
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: Typography.fontFamily.subheading,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="voice-ai"
        options={{
          title: "Voice AI",
          tabBarIcon: ({ size, color }) => <Mic size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: "Finances",
          tabBarIcon: ({ size, color }) => <DollarSign size={size} color={color} />,
        }}
      />
   
        
      <Tabs.Screen
        name="coaching"
        options={{
          title: "Coaching",
          tabBarIcon: ({ size, color }) => <UserSquare2 size={size} color={color} />,
        }}
      />
    </Tabs>
</ProtectedRoute>
    </AuthProvider> 
  );
}
