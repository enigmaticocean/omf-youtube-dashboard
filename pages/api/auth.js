import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // Simple password check (in production, use proper hashing)
  if (password === correctPassword) {
    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${password}:${Date.now()}`).toString('base64');
    res.status(200).json({ token });
  } else {
    res.status(401).json({ message: 'Invalid password' });
  }
}
