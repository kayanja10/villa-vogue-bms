module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join role-based rooms
    socket.on('join:room', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    // POS heartbeat
    socket.on('pos:active', (data) => {
      socket.to('admin').emit('pos:user-active', { ...data, socketId: socket.id });
    });

    // Typing indicators for customer support
    socket.on('support:typing', (data) => {
      socket.broadcast.emit('support:typing', data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Global broadcast helpers
  global.emitStockUpdate = (productId, stock) => io.emit('stock:updated', { productId, stock });
  global.emitNewOrder = (order) => io.emit('order:created', order);
  global.emitAlert = (msg) => io.emit('system:alert', msg);
};
