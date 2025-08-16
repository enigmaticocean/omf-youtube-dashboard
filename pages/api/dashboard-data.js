export default async function handler(req, res) {
  try {
    // Since file storage doesn't persist in serverless, 
    // let's redirect to fetch fresh data from YouTube API
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.CHANNEL_ID;
    
    if (!API_KEY || !CHANNEL_ID) {
      return res.status(500).json({ 
        error: 'Missing YouTube API credentials' 
      });
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

    // Process the data (same logic as sync)
    const processedVideos = statsData.items?.map(video => ({
      id: video.id,
      title: video.snippet.title,
      publishedAt: video.snippet.publishedAt,
      views: parseInt(video.statistics.viewCount) || 0,
      likes: parseInt(video.statistics.likeCount) || 0,
      comments: parseInt(video.statistics.commentCount) || 0,
      category: categorizeVideo(video.snippet.title, video.snippet.description || '')
    })) || [];

    // Calculate category counts
    const categoryCounts = processedVideos.reduce((acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1;
      return acc;
    }, {});

    // Calculate totals
    const totalViews = processedVideos.reduce((sum, v) => sum + v.views, 0);
    const totalVideos = processedVideos.length;
    const avgViews = Math.round(totalViews / Math.max(totalVideos, 1));

    const currentData = {
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      summary: {
        totalViews,
        totalVideos,
        avgViews,
        totalLikes: processedVideos.reduce((sum, v) => sum + v.likes, 0),
        totalComments: processedVideos.reduce((sum, v) => sum + v.comments, 0),
        recentVideos: processedVideos.length
      },
      videos: processedVideos,
      categories: Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      })),
      channel: {
        name: channelData.items?.[0]?.snippet?.title || 'Unknown',
        subscriberCount: parseInt(channelData.items?.[0]?.statistics?.subscriberCount) || 0,
        videoCount: parseInt(channelData.items?.[0]?.statistics?.videoCount) || 0,
        viewCount: parseInt(channelData.items?.[0]?.statistics?.viewCount) || 0
      }
    };

    res.status(200).json({
      current: currentData,
      comparisons: {
        yesterday: null,
        lastWeek: null,
        lastMonth: null
      },
      trends: [
        {
          date: currentData.date,
          views: currentData.summary.totalViews,
          videos: currentData.summary.totalVideos,
          avgViews: currentData.summary.avgViews
        }
      ],
      lastUpdated: currentData.timestamp
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data: ' + error.message 
    });
  }
}

function categorizeVideo(title, description, duration) {
  const titleLower = title.toLowerCase();
  
  // Check for hashtag categories first
  if (titleLower.includes('#short')) {
    return 'Short';
  }
  
  if (titleLower.includes('#podcast')) {
    return 'Podcast Promo';
  }
  
  if (titleLower.includes('#missionarymoment')) {
    return 'Missionary Moment';
  }
  
  // Check if it's a podcast episode based on duration (20+ minutes = 1200+ seconds)
  if (duration && duration >= 1200) {
    return 'Podcast Episode';
  }
  
  // Everything else is Other
  return 'Other';
}
