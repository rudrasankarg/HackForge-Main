const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { auth, requireRole } = require('../middleware/auth');

// Get announcements (role-scoped)
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.hackathonId) filter.hackathonId = req.query.hackathonId;
    if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
      filter.$or = [{ targetRole: 'all' }, { targetRole: req.user.role }];
    }
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name')
      .sort({ pinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create announcement (admin / organizer only)
router.post('/', auth, requireRole('admin', 'organizer'), async (req, res) => {
  try {
    const { title, body, targetRole, hackathonId, pinned, type } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required.' });
    const ann = await Announcement.create({ title, body, targetRole: targetRole || 'all', hackathonId, pinned: !!pinned, type: type || 'info', createdBy: req.user._id });
    req.io?.emit('new-announcement', ann);
    res.status(201).json(ann);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update announcement (admin / organizer only)
router.put('/:id', auth, requireRole('admin', 'organizer'), async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ann);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete announcement (admin / organizer only)
router.delete('/:id', auth, requireRole('admin', 'organizer'), async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
