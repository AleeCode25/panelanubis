// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getGanamosSessionToken } from "@/lib/ganamosApi"; // <-- 1. IMPORTAMOS EL MOTOR

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
          
          // Aceptamos ambos nombres para evitar el "undefined"
          const loginName = credentials?.usuario || (credentials as any)?.username;
          
          if (!loginName) {
            console.error("❌ No se recibió ningún nombre de usuario");
            return null;
          }

          console.log("🔑 Intentando login para:", loginName);

          // Buscamos al usuario por cualquiera de los dos campos (por si hay viejos)
          const user = await User.findOne({
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
          
          // --- 2. ACÁ DISPARAMOS LA MAGIA DE GANAMOS ---
          // Al ponerlo sin 'await' (o manejando el error internamente), 
          // no frenamos el login del cajero si el casino tarda en responder.
          try {
            console.log("⚙️ Verificando token de Ganamos en segundo plano...");
            await getGanamosSessionToken(); 
          } catch (ganamosError) {
            console.error("⚠️ Error actualizando token de Ganamos durante login:", ganamosError);
          }
          // ---------------------------------------------

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
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canPay = user.canPay;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.canPay = token.canPay;
        session.user.name = token.name;
      }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};