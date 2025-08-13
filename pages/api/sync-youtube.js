import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchYouTubeData() {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID;
  
  if (!API_KEY || !CHANNEL_ID) {
    throw new Error('Missing YouTube API credentials');
  }

  // Get channel info
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${API_KEY}`
  );
  const channelData = await channelResponse.json();

  // Get videos from the channel
  const videosResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&order=date&type=video&key=${API_KEY}`
  );
  const videosData = await videosResponse.json();

  // Get detailed stats for each video
  const videoIds = videosData.items?.map(item => item.id.videoId).join(',');
  const statsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${API_KEY}`
  );
  const statsData = await statsResponse.json();

  return {
    channel: channelData.items?.[0] || {},
    videos: statsData.items || []
  };
}

function categorizeVideo(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('testimony') || text.includes('story') || text.includes('personal')) {
    return 'Testimony/Personal Story';
  } else if (text.includes('introduction') || text.includes('program')) {
    return 'Program Introduction';
  } else if (text.includes('cultural') || text.includes('culture')) {
    return 'Cultural Reflection';
  } else if (text.includes('virtual') || text.includes('experience')) {
    return 'Virtual Experience';
  } else if (text.includes('promotional') || text.includes('intro')) {
    return 'Promotional/Intro';
  } else if (text.includes('mission') || text.includes('outreach')) {
    return 'Mission/Outreach';
  }
  return 'Other';
}

export default async function handler(req, res) {
  try {
    const data = await fetchYouTubeData();
    const today = new Date().toISOString().split('T')[0];
    
    // Process videos data
    const processedVideos = data.videos.map(video => ({
      id: video.id,
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      views: parseInt(video.statistics.viewCount) || 0,
      likes: parseInt(video.statistics.likeCount) || 0,
      comments: parseInt(video.statistics.commentCount) || 0,
      category: categorizeVideo(video.snippet.title, video.snippet.description || '')
    }));

    // Calculate category counts
    const categoryCounts = processedVideos.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});

    // Calculate totals and averages
    const totalViews = processedVideos.reduce((sum, v) => sum + v.views, 0);
    const totalVideos = processedVideos.length;
    const avgViews = Math.round(totalViews / Math.max(totalVideos, 1));

    // Get last 30 days of videos for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVideos = processedVideos.filter(video => 
      new Date(video.publishedAt) >= thirtyDaysAgo
    );

    const todayData = {
      date: today,
      timestamp: new Date().toISOString(),
      summary: {
        totalViews,
        totalVideos,
        avgViews,
        totalLikes: processedVideos.reduce((sum, v) => sum + v.likes, 0),
        totalComments: processedVideos.reduce((sum, v) => sum + v.comments, 0),
        recentVideos: recentVideos.length
      },
      videos: processedVideos,
      categories: Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      })),
      channel: {
        name: data.channel.snippet?.title || 'Unknown',
        subscriberCount: parseInt(data.channel.statistics?.subscriberCount) || 0,
        videoCount: parseInt(data.channel.statistics?.videoCount) || 0,
        viewCount: parseInt(data.channel.statistics?.viewCount) || 0
      }
    };

    // Save today's data
    const todayFile = path.join(DATA_DIR, `${today}.json`);
    fs.writeFileSync(todayFile, JSON.stringify(todayData, null, 2));

    // Clean up old files (keep only last 30 days)
    const files = fs.readdirSync(DATA_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    files.forEach(file => {
      if (file.endsWith('.json') && file !== 'summary.json') {
        const fileDate = new Date(file.replace('.json', ''));
        if (fileDate < cutoffDate) {
          fs.unlinkSync(path.join(DATA_DIR, file));
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Data synced successfully',
      videosProcessed: processedVideos.length,
      totalViews,
      lastUpdated: todayData.timestamp
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
