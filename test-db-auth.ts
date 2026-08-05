import { db } from './src/lib/db/server';
import { users } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './src/lib/utils/password';

async function testAuth() {
  const email = 'soufiane.erd22@gmail.com';
  console.log('Testing auth for:', email);
  
  const result = await db.select().from(users).where(eq(users.email, email));
  const user = result[0];
  
  if (!user) {
    console.log('User not found!');
    process.exit(1);
  }
  
  console.log('User found:', {
    id: user.id,
    email: user.email,
    hasPassword: !!user.password,
    passwordLength: user.password ? user.password.length : 0
  });
  
  // Try to verify some passwords
  const passwordsToTest = ['password', 'password123', 'test', 'Test1234!', '123456', '12345678', '123456789'];
  
  for (const p of passwordsToTest) {
    const isValid = await verifyPassword(p, user.password as string);
    console.log(`Password "${p}": ${isValid ? 'VALID' : 'invalid'}`);
  }
  
  process.exit(0);
}

testAuth().catch(console.error);
