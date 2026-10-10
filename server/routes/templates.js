const express = require('express');
const router = express.Router();
const prisma = require('../lib/db');

// List templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // Parse threads JSON for each template
    const parsed = templates.map((t) => ({
      ...t,
      threads: JSON.parse(t.threads),
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save template
router.post('/', async (req, res) => {
  try {
    const { name, threads } = req.body;
    if (!name || !threads) {
      return res.status(400).json({ error: 'name and threads are required' });
    }

    const template = await prisma.template.create({
      data: {
        name,
        threads: JSON.stringify(threads),
      },
    });

    res.status(201).json({
      ...template,
      threads: JSON.parse(template.threads),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete template
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Manager access only' });
    await prisma.template.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Template not found' });
  }
});

module.exports = router;
