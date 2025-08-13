export default function handler(req, res) {
  const { token } = req.body;
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [password, timestamp] = decoded.split(':');
    
    // Check if token is less than 24 hours old
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (password === process.env.DASHBOARD_PASSWORD && tokenAge < maxAge) {
      res.status(200).json({ valid: true });
    } else {
      res.status(401).json({ valid: false });
    }
  } catch (error) {
    res.status(401).json({ valid: false });
  }
}
