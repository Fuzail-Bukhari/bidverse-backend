import Auction from "../models/Auction.js";
import cloudinary from "../config/cloudinary.js";

export const createAuction = async (req, res) => {
  try {
    const {
      title, description, category,
      startingPrice, reservePrice, endTime,
    } = req.body;

    if (!title || !description || !category || !startingPrice || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const images = req.files ? req.files.map((file) => file.path) : [];

    const auction = await Auction.create({
      title,
      description,
      category,
      startingPrice: Number(startingPrice),
      reservePrice: Number(reservePrice) || 0,
      currentPrice: Number(startingPrice),
      sellerId: req.user._id,
      startTime: new Date(),
      endTime: new Date(endTime),
      status: "live",
      images,
    });

    res.status(201).json({ success: true, auction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllAuctions = async (req, res) => {
  try {
    const { category, status, search, sort } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { currentPrice: 1 };
    if (sort === "price_desc") sortOption = { currentPrice: -1 };
    if (sort === "ending_soon") sortOption = { endTime: 1 };

    const auctions = await Auction.find(filter)
      .sort(sortOption)
      .populate("sellerId", "name avatar email");

    res.status(200).json({ success: true, count: auctions.length, auctions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("sellerId", "name avatar email")
      .populate("winnerId", "name avatar");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    res.status(200).json({ success: true, auction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const isOwner = auction.sellerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Handle images
    let images = auction.images;

    if (req.body.keepImages) {
      try {
        images = JSON.parse(req.body.keepImages);
      } catch {}
    }

    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map((file) => file.path);
      images = [...images, ...newImageUrls];
      if (images.length > 5) images = images.slice(0, 5);
    }

    let updateData = { images };

    if (auction.status === "live") {
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.endTime) updateData.endTime = new Date(req.body.endTime);
    } else if (auction.status === "ended") {
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
    } else {
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.startingPrice) updateData.startingPrice = Number(req.body.startingPrice);
      if (req.body.reservePrice !== undefined) updateData.reservePrice = Number(req.body.reservePrice);
      if (req.body.endTime) updateData.endTime = new Date(req.body.endTime);
    }

    const updated = await Auction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, auction: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const isOwner = auction.sellerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    for (const imageUrl of auction.images) {
      try {
        const parts = imageUrl.split("/");
        const publicId = "auction-app/" + parts[parts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch {}
    }

    await auction.deleteOne();
    res.status(200).json({ success: true, message: "Auction deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("sellerId", "name avatar");
    res.status(200).json({ success: true, count: auctions.length, auctions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};