---
title: "React Native con Expo Router: lecciones de AuditGlow"
description: "Mi experiencia construyendo una app móvil real con Expo, Expo Router, Camera API y Secure Store. Navegación file-based, captura de fotos, autenticación segura y las diferencias con React web."
date: "2026-04-09"
tags:
  - Mobile
  - React Native
  - Expo
readTime: "11 min"
draft: false
lang: es
slug: react-native-expo-router
---

Vengo del mundo web — React, Next.js, Vite. Cuando empecé a construir [AuditGlow](/projects/auditglow), una app de auditoría con documentación fotográfica, esperaba que React Native fuera "React pero para móvil". No lo es. Es su propia bestia, con sus propias reglas. Aquí comparto lo que aprendí.

## Por qué Expo (y no React Native CLI)

La decisión fue rápida:

- **Expo**: `npx create-expo-app`, corre en simulador o dispositivo real en 30 segundos. Actualizaciones OTA. Build en la nube con EAS.
- **React Native CLI**: Configurar Xcode, Android Studio, pods, gradle. 2 horas antes de ver "Hello World".

Para un proyecto donde el valor está en la lógica de auditoría y no en módulos nativos custom, Expo es la elección correcta. Si necesitara Bluetooth o sensores específicos, reconsideraría.

## Expo Router: navegación file-based

Si vienes de Next.js, Expo Router se siente como volver a casa. La estructura de archivos define las rutas:

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

### Layouts anidados

El concepto más poderoso. El `_layout.tsx` raíz maneja autenticación:

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

El layout de tabs maneja la navegación principal:

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

### Diferencias con Next.js

| Next.js | Expo Router |
|---|---|
| `<Link href="/about">` | `<Link href="/about">` (igual) |
| `useRouter().push()` | `router.push()` (casi igual) |
| `[slug].tsx` → params.slug | `[id].tsx` → `useLocalSearchParams()` |
| Layouts con `children` | Layouts con `<Stack>`, `<Tabs>`, `<Drawer>` |
| SSR/SSG/ISR | Solo client-side |

La API es similar, pero los layouts de Expo Router usan componentes de navegación nativos en lugar de divs — esto significa animaciones nativas de transición entre pantallas gratis.

## Camera API: captura de evidencia

El core de AuditGlow es la documentación fotográfica. Cada auditoría requiere fotos de antes/después de las condiciones encontradas.

### Permisos

Lo primero que aprendes en mobile: todo requiere permisos explícitos.

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

### Captura de fotos

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

### Lecciones sobre fotos

1. **Calidad 0.8 es suficiente**: La diferencia visual entre 0.8 y 1.0 es mínima, pero el tamaño es 40% menor. En una auditoría con 50+ fotos, esto importa.

2. **EXIF es tu amigo**: La metadata GPS y timestamp prueban dónde y cuándo se tomó la foto — crítico para auditorías que requieren evidencia verificable.

3. **Compress antes de subir**: Las fotos de cámara moderna son de 5-12MB. Comprimirlas a ~500KB antes de subir al cloud ahorra datos móviles y tiempo de carga.

## Secure Store: autenticación segura

En web guardamos tokens en localStorage o cookies. En mobile, eso es inseguro — cualquier app con acceso al filesystem podría leer el token.

Expo Secure Store usa el keychain de iOS y el keystore de Android:

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

### Flujo de autenticación completo

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

## Roles y permisos

AuditGlow tiene 4 roles con permisos diferenciados:

| Rol | Puede hacer |
|---|---|
| **Auditor** | Crear auditorías, tomar fotos, evaluar áreas |
| **Supervisor** | Todo lo anterior + aprobar/rechazar auditorías |
| **Cliente** | Ver reportes de sus instalaciones |
| **Empleado** | Ver auditorías asignadas, agregar comentarios |

En la UI, esto se traduce en renderizado condicional:

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

## Las diferencias que nadie te dice

### 1. No hay CSS como lo conoces

React Native usa un subconjunto de CSS con Flexbox como default (no block). No hay `grid`, no hay `position: fixed` en el sentido web, y los estilos son objetos JavaScript:

```tsx
// Esto NO funciona
<View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

// Esto SÍ funciona
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <View style={{ width: '50%' }}>{/* item */}</View>
  <View style={{ width: '50%' }}>{/* item */}</View>
</View>
```

### 2. Las listas son diferentes

`map()` sobre un array renderiza todo en memoria. En mobile con listas largas, esto mata el rendimiento. Usa `FlatList`:

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

### 3. Los gestos importan

En web, todo es click. En mobile, hay tap, long press, swipe, pinch. Expo tiene `react-native-gesture-handler` para gestos complejos, pero para lo básico:

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

### 4. Las animaciones nativas son obligatorias

En web puedes safarte con CSS transitions. En mobile, animaciones lentas = app que se siente rota. `react-native-reanimated` corre animaciones en el thread de UI nativo:

```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.delay(index * 100)}>
  <AuditCard audit={audit} />
</Animated.View>
```

## Mi consejo para developers web → mobile

1. **No intentes replicar tu web app**: Mobile tiene sus propios patrones de UX. Un sidebar en web es un bottom tab en mobile. Un modal en web es un push screen en mobile.

2. **Expo Router es el mejor punto de entrada**: Si vienes de Next.js, la curva de aprendizaje es mínima para la navegación.

3. **Testa en dispositivo real**: El simulador miente — performance, gestos, y cámara se comportan diferente en un dispositivo real.

4. **Empieza con Expo, escapa después si necesitas**: Expo te deja `eject` si eventualmente necesitas módulos nativos custom. No sacrifiques la velocidad de desarrollo por flexibilidad que probablemente no necesites.

5. **La gestión de estado es igual**: Zustand, TanStack Query, Context API — todo funciona igual en React Native. No necesitas aprender nada nuevo aquí.
