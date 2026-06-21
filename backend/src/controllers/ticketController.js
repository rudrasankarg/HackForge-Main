const Ticket = require('../models/Ticket');

// Create a new support ticket
const createTicket = async (req, res) => {
  try {
    const { subject, category, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required.' });
    }

    const ticket = await Ticket.create({
      userId: req.user._id,
      subject,
      category: category || 'technical',
      description,
      status: 'open'
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get tickets (admins see all, users see their own)
const getTickets = async (req, res) => {
  try {
    const filter = ['admin', 'organizer', 'reviewer'].includes(req.user.role) ? {} : { userId: req.user._id };
    const tickets = await Ticket.find(filter)
      .populate('userId', 'name email role')
      .sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single ticket
const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('replies.sender', 'name email role');
    
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    // Restrict access: participants can only see their own tickets
    if (!['admin', 'organizer', 'reviewer'].includes(req.user.role) && ticket.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a reply/comment to a ticket
const replyTicket = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ message: 'Reply body is required.' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    // Restrict access: participants can only reply to their own tickets
    if (!['admin', 'organizer', 'reviewer'].includes(req.user.role) && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const reply = {
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      body,
      createdAt: new Date()
    };

    ticket.replies.push(reply);

    // Auto update status: if admin/mentor replies, set to in-progress
    if (['admin', 'organizer', 'reviewer'].includes(req.user.role) && ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    // Populate reply sender details before returning
    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('userId', 'name email role')
      .populate('replies.sender', 'name email role');

    res.json(updatedTicket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update status of a ticket (admin only)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in-progress', 'resolved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

    ticket.status = status;
    await ticket.save();

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  replyTicket,
  updateTicketStatus
};
