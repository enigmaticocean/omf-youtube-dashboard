import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function loadDataFile(date) {
  try {
    const filePath = path.join(DATA_DIR, `${date}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading data for ${date}:`, error);
  }
  return null;
}

export default function handler(req, res) {
  try {
    // Get today's data
    const today = getDateString(0);
    const yesterday = getDateString(1);
    const lastWeek = getDateString(7);
    const lastMonth = getDateString(30);

    const todayData = loadDataFile(today);
    const yesterdayData = loadDataFile(yesterday);
    const lastWeekData = loadDataFile(lastWeek);
    const lastMonthData = loadDataFile(lastMonth);

    if (!todayData) {
      return res.status(404).json({ 
        error: 'No data available. Run sync first.' 
      });
    }

    // Calculate comparisons
    const comparisons = {
      yesterday: yesterdayData ? {
        views: todayData.summary.totalViews - yesterdayData.summary.totalViews,
        videos: todayData.summary.totalVideos - yesterdayData.summary.totalVideos,
        avgViews: todayData.summary.avgViews - yesterdayData.summary.avgViews
      } : null,
      lastWeek: lastWeekData ? {
        views: todayData.summary.totalViews - lastWeekData.summary.totalViews,
        videos: todayData.summary.totalVideos - lastWeekData.summary.totalVideos,
        avgViews: todayData.summary.avgViews - lastWeekData.summary.avgViews
      } : null,
      lastMonth: lastMonthData ? {
        views: todayData.summary.totalViews - lastMonthData.summary.totalViews,
        videos: todayData.summary.totalVideos - lastMonthData.summary.totalVideos,
        avgViews: todayData.summary.avgViews - lastMonthData.summary.avgViews
      } : null
    };

    // Get historical trend data
    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = getDateString(i);
      const data = loadDataFile(date);
      if (data) {
        trendData.push({
          date,
          views: data.summary.totalViews,
          videos: data.summary.totalVideos,
          avgViews: data.summary.avgViews
        });
      }
    }

    res.status(200).json({
      current: todayData,
      comparisons,
      trends: trendData,
      lastUpdated: todayData.timestamp
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data' 
    });
  }
}
