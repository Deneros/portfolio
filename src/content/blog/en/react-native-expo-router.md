---
title: "React Native with Expo Router: lessons from AuditGlow"
description: "My experience building a real mobile app with Expo, Expo Router, Camera API, and Secure Store. File-based navigation, photo capture, secure authentication, and the differences from React web."
date: "2026-04-09"
tags:
  - Mobile
  - React Native
  - Expo
readTime: "11 min"
draft: false
lang: en
slug: react-native-expo-router
---

I come from the web world — React, Next.js, Vite. When I started building [AuditGlow](/projects/auditglow), an audit app with photo documentation, I expected React Native to be "React but for mobile." It's not. It's its own beast, with its own rules. Here's what I learned.

## Why Expo (and not React Native CLI)

The decision was quick:

- **Expo**: `npx create-expo-app`, runs on simulator or real device in 30 seconds. OTA updates. Cloud builds with EAS.
- **React Native CLI**: Configure Xcode, Android Studio, pods, gradle. 2 hours before seeing "Hello World."

For a project where the value is in the audit logic and not in custom native modules, Expo is the right choice. If I needed Bluetooth or specific sensors, I'd reconsider.

## Expo Router: file-based navigation

If you come from Next.js, Expo Router feels like coming home. The file structure defines the routes:

```
app/
├── _layout.tsx           # Root layout (providers, auth check)
├── (auth)/
│   ├── _layout.tsx       # Auth layout (sin tab bar)
│   ├── login.tsx         # /login
│   └── register.tsx      # /register
├── (tabs)/
│   ├── _layout.tsx       # Tab layout (bottom navigation)
│   ├── index.tsx         # / (Dashboard)
│   ├── audits.tsx        # /audits
│   ├── spaces.tsx        # /spaces
│   └── reports.tsx       # /reports
└── audit/
    └── [id].tsx          # /audit/123 (detalle)
```

### Nested layouts

The most powerful concept. The root `_layout.tsx` handles authentication:

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

  return (
    <Stack>
      {isAuthenticated ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

The tabs layout handles the main navigation:

```tsx
// app/(tabs)/_layout.tsx
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <DashboardIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="audits"
        options={{
          title: 'Audits',
          tabBarIcon: ({ color }) => <AuditIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Differences from Next.js

| Next.js | Expo Router |
|---|---|
| `<Link href="/about">` | `<Link href="/about">` (same) |
| `useRouter().push()` | `router.push()` (almost the same) |
| `[slug].tsx` -> params.slug | `[id].tsx` -> `useLocalSearchParams()` |
| Layouts with `children` | Layouts with `<Stack>`, `<Tabs>`, `<Drawer>` |
| SSR/SSG/ISR | Client-side only |

The API is similar, but Expo Router's layouts use native navigation components instead of divs — this means free native transition animations between screens.

## Camera API: evidence capture

AuditGlow's core is photo documentation. Each audit requires before/after photos of the conditions found.

### Permissions

The first thing you learn in mobile: everything requires explicit permissions.

```tsx
import * as ImagePicker from 'expo-image-picker';

async function requestCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permiso necesario',
      'AuditGlow necesita acceso a la cámara para documentar auditorías'
    );
    return false;
  }
  return true;
}
```

### Photo capture

```tsx
async function takePhoto() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,           // Balance calidad/tamaño
    allowsEditing: true,    // Crop antes de guardar
    aspect: [4, 3],
    exif: true,             // Incluir metadata (GPS, fecha)
  });

  if (!result.canceled) {
    const photo = result.assets[0];
    await saveEvidence(photo.uri, {
      location: photo.exif?.GPSLatitude,
      timestamp: new Date().toISOString(),
      auditId: currentAudit.id,
    });
  }
}
```

### Lessons about photos

1. **Quality 0.8 is enough**: The visual difference between 0.8 and 1.0 is minimal, but the file size is 40% smaller. In an audit with 50+ photos, this matters.

2. **EXIF is your friend**: GPS and timestamp metadata prove where and when the photo was taken — critical for audits that require verifiable evidence.

3. **Compress before uploading**: Modern camera photos are 5-12MB. Compressing them to ~500KB before uploading to the cloud saves mobile data and upload time.

## Secure Store: secure authentication

On the web we store tokens in localStorage or cookies. On mobile, that's insecure — any app with filesystem access could read the token.

Expo Secure Store uses the iOS keychain and Android keystore:

```tsx
import * as SecureStore from 'expo-secure-store';

// Guardar token
await SecureStore.setItemAsync('auth_token', token);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// Leer token
const token = await SecureStore.getItemAsync('auth_token');

// Borrar (logout)
await SecureStore.deleteItemAsync('auth_token');
await SecureStore.deleteItemAsync('refresh_token');
```

### Full authentication flow

```tsx
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Al abrir la app, verificar si hay token guardado
    async function loadUser() {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        try {
          const userData = await api.getMe(token);
          setUser(userData);
        } catch {
          // Token expirado, intentar refresh
          await refreshAuth();
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, []);

  async function login(email: string, password: string) {
    const { token, refreshToken, user } = await api.login(email, password);
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    setUser(user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    setUser(null);
    router.replace('/login');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Roles and permissions

AuditGlow has 4 roles with differentiated permissions:

| Role | Can do |
|---|---|
| **Auditor** | Create audits, take photos, evaluate areas |
| **Supervisor** | All of the above + approve/reject audits |
| **Client** | View reports for their facilities |
| **Employee** | View assigned audits, add comments |

In the UI, this translates to conditional rendering:

```tsx
function AuditActions({ audit }: { audit: Audit }) {
  const { user } = useAuth();

  return (
    <View>
      {user.role === 'auditor' && (
        <Button onPress={() => startEvaluation(audit.id)}>
          Evaluar
        </Button>
      )}
      {user.role === 'supervisor' && (
        <>
          <Button onPress={() => approve(audit.id)}>Aprobar</Button>
          <Button variant="destructive" onPress={() => reject(audit.id)}>
            Rechazar
          </Button>
        </>
      )}
      {user.role === 'client' && (
        <Button onPress={() => downloadReport(audit.id)}>
          Descargar reporte
        </Button>
      )}
    </View>
  );
}
```

## The differences nobody tells you about

### 1. There's no CSS as you know it

React Native uses a subset of CSS with Flexbox as the default (not block). There's no `grid`, no `position: fixed` in the web sense, and styles are JavaScript objects:

```tsx
// Esto NO funciona
<View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

// Esto SÍ funciona
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <View style={{ width: '50%' }}>{/* item */}</View>
  <View style={{ width: '50%' }}>{/* item */}</View>
</View>
```

### 2. Lists are different

`map()` over an array renders everything in memory. On mobile with long lists, this kills performance. Use `FlatList`:

```tsx
// Malo — renderiza todo
{audits.map(audit => <AuditCard key={audit.id} audit={audit} />)}

// Bueno — virtualiza, solo renderiza lo visible
<FlatList
  data={audits}
  renderItem={({ item }) => <AuditCard audit={item} />}
  keyExtractor={item => item.id}
/>
```

### 3. Gestures matter

On the web, everything is a click. On mobile, there's tap, long press, swipe, pinch. Expo has `react-native-gesture-handler` for complex gestures, but for the basics:

```tsx
<Pressable
  onPress={() => openAudit(id)}
  onLongPress={() => showOptions(id)}
  style={({ pressed }) => [
    styles.card,
    pressed && styles.cardPressed
  ]}
>
```

### 4. Native animations are mandatory

On the web you can get away with CSS transitions. On mobile, slow animations = an app that feels broken. `react-native-reanimated` runs animations on the native UI thread:

```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.delay(index * 100)}>
  <AuditCard audit={audit} />
</Animated.View>
```

## My advice for web -> mobile developers

1. **Don't try to replicate your web app**: Mobile has its own UX patterns. A sidebar on web is a bottom tab on mobile. A modal on web is a push screen on mobile.

2. **Expo Router is the best entry point**: If you come from Next.js, the learning curve is minimal for navigation.

3. **Test on a real device**: The simulator lies — performance, gestures, and camera behave differently on a real device.

4. **Start with Expo, eject later if needed**: Expo lets you `eject` if you eventually need custom native modules. Don't sacrifice development speed for flexibility you probably don't need.

5. **State management is the same**: Zustand, TanStack Query, Context API — everything works the same in React Native. You don't need to learn anything new here.
