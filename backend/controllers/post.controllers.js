import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

import {v2 as cloudinary} from "cloudinary";

export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        const following = user.following;
        const feedPosts = await Post.find({ user: { $in: following } }).sort({ createdAt: -1 })
        .populate({
            path: "user",
            select: "-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        });

        res.status(200).json(feedPosts);
    } catch (error) {
        console.log("Error in getFollowingPosts controller: ", error.message);
        res.status(500).json({ error: error.message });
    }
}

export const getMyActivities = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findOne({userId});
        if(!user){
            return res.status(404).json({error: "User not found"});
        }
        
        const posts = await Post.find({user: user._id}).sort({createdAt: -1})
        .populate({
            path: "user",
            select: "-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        })

        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getMyActivities controller: ", error.message);
        res.status(500).json({ error: error.message });
        
    }
}

export const getUserPosts = async (req, res) => {
    try {
        const {username} = req.params;

        const user = await User.findOne({username});

        if(!user){
            return res.status(404).json({error: "User not found"});
        }

        const posts = await Post.find({user: user._id}).sort({createdAt: -1})
        .populate({
            path: "user",
            select:"-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        });

        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getUserPosts controller: ", error.message);
        res.status(500).json({ error: error.message });
        
    }
}

export const createPost = async (req, res) => {
    try {
        const {text, route} = req.body;
        let {img} = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({error: "User not found"});
        }
        if(!text && !img){
            return res.status(400).json({error: "Please provide text or image"});
        }

        if(img){
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({
            user: userId,
            text,
            img,
        })

        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.log("Error in createPost controller: ", error.message);
        res.status(500).json({ error: error.message });
        
    }
}

export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if(!post){
            return res.status(404).json({error: "Post not found"});
        }

        const isLiked = post.likes.includes(userId);

        if(isLiked){
            await Post.updateOne({_id: postId}, {$pull: {likes: userId}});
            await User.updateOne({_id: userId}, {$pull: {likedPosts: postId}});

            const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        }else{
            if(post.user.toString() === userId.toString()){
                return res.status(401).json({error: "You cannot like your own post"});
            }
            post.likes.push(userId);
            await User.updateOne({_id: userId}, {$push: {likedPosts: postId}});
            await post.save();

            const notification = new Notification ({
                to: post.user,
                icon: userId.profileImg,
                title: "New Kudos",
                text: `${userId.firstname} ${userId.lastname} gave you Kudos on ${post.title}!`,
                actionable_link: `/post/${postId}`,
                display_date: new Date(),
                read: false,
                category: "kudos",
            })

            await notification.save();
            const updatedLikes = post.likes;

            res.status(200).json(updatedLikes);
        }
    } catch (error) {
        console.log("Error in likePost controller: ", error.message);
        res.status(500).json({ error: error.message });
        
    }
}

export const commentOnPost = async (req, res) => {
    try {
        const {text} = req.body;
        const userId = req.user._id;
        if(!text){
            return res.status(400).json({error: "Comment must have text"});
        }

        const post = await Post.findById(req.params._id);
        if(!post){
            return res.status(404).json({error: "Post not found"});
        }

        const newComment = {
            user: userId,
            text,
        }

        post.comments.push(newComment);
        await post.save();

        const notification = new Notification({
            to: post.user,
            icon: userId.profileImg,
            title: "New Comment",
            text: `${userId.firstname} ${userId.lastname} commented on ${post.title}!`,
            actionable_link: `/post/${post._id}`,
            display_date: new Date(),
            read: false,
            category: "comment",
        })

        await notification.save();
        res.status(200).json(post);
    } catch (error) {
        console.log("Error in commentOnPost controller: ", error.message);
        res.status(500).json({ error: error.message });
        
    }
}

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params._id);
        if(!post){return res.status(404).json({error: "Post not found"})}
        if(post.user.toString() !== req.user._id.toString()){
            return res.status(401).json({error: "You are not authorized to delete this post"})
        }

        if(post.img){
            const imgId = post.img.split("/").pop.split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(req.params._id);

        res.status(200).json({message: "Post deleted successfully"});
    } catch (error) {
        console.log("Error in deletePost controller: ", error);
        res.status(500).json({error: "Internal Server Error"});
    }
}