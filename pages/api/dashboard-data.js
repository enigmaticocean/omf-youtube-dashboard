function convertYouTubeDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

function categorizeVideo(title, description, duration) {
  const titleLower = title.toLowerCase();
  
  if (duration && duration >= 1200) {
    return 'Podcast Episode';
  }
  
  if (titleLower.includes('#short')) {
    return 'Short';
  }
  
  if (titleLower.includes('#podcast')) {
    return 'Podcast Promo';
  }
  
  if (titleLower.includes('#missionarymoment')) {
    return 'Missionary Moment';
  }
  
  return 'Other';
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function calculateTrends(videos) {
  // Group videos by publish date
  const videosByDate = {};
  
  videos.forEach(video => {
    const date = video.publishedAt.split('T')[0];
    if (!videosByDate[date]) {
      videosByDate[date] = [];
    }
    videosByDate[date].push(video);
  });

  // Create trend data for last 30 days
  const trends = [];
  let cumulativeViews = 0;
  let cumulativeVideos = 0;

  for (let i = 29; i >= 0; i--) {
    const date = getDateDaysAgo(i);
    const videosOnDate = videosByDate[date] || [];
    
    // Add new videos published on this date
    cumulativeVideos += videosOnDate.length;
    
    // Calculate total views up to this date (all videos published by this date)
    const viewsUpToDate = videos
      .filter(v => v.publishedAt.split('T')[0] <= date)
      .reduce((sum, v) => sum + v.views, 0);
    
    const avgViews = cumulativeVideos > 0 ? Math.round(viewsUpToDate / cumulativeVideos) : 0;
    
    trends.push({
      date,
      views: viewsUpToDate,
      videos: cumulativeVideos,
      avgViews: avgViews,
      newVideos: videosOnDate.length
    });
  }

  return trends;
}

function calculateComparisons(currentData, trends) {
  const today = trends[trends.length - 1];
  const yesterday = trends[trends.length - 2];
  const lastWeek = trends[trends.length - 8];
  const lastMonth = trends[0];

  return {
    yesterday: yesterday ? {
      views: today.views - yesterday.views,
      videos: today.videos - yesterday.videos,
      avgViews: today.avgViews - yesterday.avgViews
    } : null,
    lastWeek: lastWeek ? {
      views: today.views - lastWeek.views,
      videos: today.videos - lastWeek.videos,
      avgViews: today.avgViews - lastWeek.avgViews
    } : null,
    lastMonth: lastMonth ? {
      views: today.views - lastMonth.views,
      videos: today.videos - lastMonth.videos,
      avgViews: today.avgViews - lastMonth.avgViews
    } : null
  };
}

export default async function handler(req, res) {
  try {
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

    // Get videos from the channel (get more for better trend analysis)
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&order=date&type=video&key=${API_KEY}`
    );
    const videosData = await videosResponse.json();

    // Get detailed stats for each video INCLUDING DURATION
    const videoIds = videosData.items?.map(item => item.id.videoId).join(',');
    const statsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${API_KEY}`
    );
    const statsData = await statsResponse.json();

    // Process the data
    const processedVideos = statsData.items?.map(video => {
      const duration = convertYouTubeDuration(video.contentDetails?.duration);
      
      return {
        id: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        views: parseInt(video.statistics.viewCount) || 0,
        likes: parseInt(video.statistics.likeCount) || 0,
        comments: parseInt(video.statistics.commentCount) || 0,
        duration: duration,
        category: categorizeVideo(video.snippet.title, video.snippet.description || '', duration)
      };
    }) || [];

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

    // Calculate trends and comparisons
    const trends = calculateTrends(processedVideos);
    const comparisons = calculateComparisons(currentData, trends);

    res.status(200).json({
      current: currentData,
      comparisons,
      trends,
      lastUpdated: currentData.timestamp
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data: ' + error.message 
    });
  }
}
