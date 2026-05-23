// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
// 👇 1. IMPORTAMOS EL MODELO NUEVO (UserGanamos)
import UserGanamos from "@/models/UserGanamos"; 
import bcrypt from "bcryptjs";
import { getGanamosSessionToken } from "@/lib/ganamosApi";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          await dbConnect();
          
          const loginName = credentials?.usuario || (credentials as any)?.username;
          
          if (!loginName) {
            console.error("❌ No se recibió ningún nombre de usuario");
            return null;
          }

          console.log("🔑 Intentando login para:", loginName);

          // 👇 2. BUSCAMOS EN LA COLECCIÓN NUEVA
          const user = await UserGanamos.findOne({
            $or: [ { usuario: loginName }, { username: loginName } ]
          });

          if (!user) {
            console.error("❌ Usuario no encontrado:", loginName);
            return null;
          }

          const isValid = await bcrypt.compare(credentials!.password, user.password);
          if (!isValid) {
            console.error("❌ Contraseña incorrecta para:", loginName);
            return null;
          }

          console.log("✅ Login exitoso para:", user.nombre);
          
          try {
            console.log("⚙️ Verificando token de Ganamos en segundo plano...");
            await getGanamosSessionToken(); 
          } catch (ganamosError) {
            console.error("⚠️ Error actualizando token de Ganamos durante login:", ganamosError);
          }

          return { 
            id: user._id.toString(), 
            name: user.nombre, 
            role: user.role, 
            canPay: user.canPay || false
          };
        } catch (error) {
          console.error("🔥 Error en authorize:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // Cuando el usuario recién se loguea, metemos sus datos en el token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canPay = user.canPay;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: any) {
      // 👇 3. PASAMOS LOS DATOS DEL TOKEN A LA SESIÓN FRONTEND
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).canPay = token.canPay;
        session.user.name = token.name as string;
      }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};