import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ message: "Server is running" });
});

export default router;  