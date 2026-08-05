import { hashPassword, verifyPassword } from '../src/lib/utils/password';

(async () => {
  const hash = await hashPassword('password123');
  console.log('Hash:', hash);
  const valid = await verifyPassword('password123', hash);
  console.log('Valid:', valid);
})();
