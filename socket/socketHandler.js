export const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join auction room for live bid updates
    socket.on("join_auction", (auctionId) => {
      socket.join(auctionId);
      console.log(`User joined auction room: ${auctionId}`);
    });

    // Leave auction room
    socket.on("leave_auction", (auctionId) => {
      socket.leave(auctionId);
    });

    // Join personal room for notifications
    socket.on("join_user_room", (userId) => {
      socket.join(userId);
      console.log(`User joined personal room: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
};