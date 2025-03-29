
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, ThumbsUp, Flame } from "lucide-react";
import { motion } from "framer-motion";

const memes = [
  {
    id: 1,
    src: "/memes/starter1.jpg",
    title: "When Monday Hits You",
    likes: 42,
  },
  {
    id: 2,
    src: "/memes/starter2.jpg",
    title: "Me vs Responsibilities",
    likes: 88,
  },
];

export default function Home() {
  const [uploadedMemes, setUploadedMemes] = useState(memes);
  const [file, setFile] = useState(null);

  const handleUpload = () => {
    if (file) {
      const newMeme = {
        id: Date.now(),
        src: URL.createObjectURL(file),
        title: file.name,
        likes: 0,
      };
      setUploadedMemes([newMeme, ...uploadedMemes]);
    }
  };

  const handleLike = (id) => {
    setUploadedMemes((prev) =>
      prev.map((meme) =>
        meme.id === id ? { ...meme, likes: meme.likes + 1 } : meme
      )
    );
  };

  const topMeme = [...uploadedMemes].sort((a, b) => b.likes - a.likes)[0];

  return (
    <div className="p-6 bg-black min-h-screen text-white font-bold">
      <motion.h1
        className="text-4xl md:text-6xl text-center mb-10"
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ repeat: Infinity, duration: 5 }}
      >
        the<span className="text-pink-500">MEMES</span>.net
      </motion.h1>

      <div className="mb-6 text-center">
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <Button onClick={handleUpload} className="bg-pink-600 hover:bg-pink-800">
          <Upload className="mr-2" /> Upload Your Meme
        </Button>
      </div>

      {topMeme && (
        <div className="mb-10">
          <h2 className="text-2xl mb-4 flex items-center justify-center gap-2">
            <Flame /> Hottest Meme Today
          </h2>
          <img
            src={topMeme.src}
            alt={topMeme.title}
            className="mx-auto max-w-sm rounded-2xl shadow-xl border-4 border-pink-600"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uploadedMemes.map((meme) => (
          <Card
            key={meme.id}
            className="bg-white text-black shadow-lg border-pink-500 border-2"
          >
            <CardContent className="p-4">
              <h3 className="text-xl font-extrabold mb-2">{meme.title}</h3>
              <img
                src={meme.src}
                alt={meme.title}
                className="rounded-xl mb-3 max-h-64 w-full object-contain"
              />
              <Button
                onClick={() => handleLike(meme.id)}
                className="bg-yellow-400 hover:bg-yellow-600 text-black w-full"
              >
                <ThumbsUp className="mr-2" /> {meme.likes} Likes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
