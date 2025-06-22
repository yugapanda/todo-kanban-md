import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { KanbanData } from '../types';
import { format, parse, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ja } from 'date-fns/locale';

interface AnalyticsProps {
  data: KanbanData;
  onClose: () => void;
}

interface TimeData {
  type: string;
  minutes: number;
  hours: number;
}

interface MonthlyData {
  day: string;
  [key: string]: string | number;
}

// Generate consistent colors for task types
const generateColor = (type: string): string => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
    '#d084d0', '#ffb347', '#67b7dc', '#a4de6c', '#ffd93d'
  ];

  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const Analytics: React.FC<AnalyticsProps> = ({ data, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate time spent by type for the current month
  const { timeByType, dailyData, totalHours } = useMemo(() => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const typeMap = new Map<string, number>();
    const dailyMap = new Map<string, Map<string, number>>();

    // Process all todos
    data.lanes.forEach(lane => {
      lane.todos.forEach(todo => {
        if (todo.doingPendingHistory.length === 0) return;

        // Use "その他" (Other) for tasks without a type
        const taskType = todo.type || 'その他';

        todo.doingPendingHistory.forEach(entry => {
          if (!entry.doing) return;

          try {
            const startTime = parse(entry.doing, 'yyyyMMddHHmm', new Date());
            // If pending is missing, use current time (task is still in progress)
            const endTime = entry.pending 
              ? parse(entry.pending, 'yyyyMMddHHmm', new Date())
              : new Date();

            // Check if this entry is within the current month
            if (isWithinInterval(startTime, { start: startDate, end: endDate }) ||
              isWithinInterval(endTime, { start: startDate, end: endDate })) {

              const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

              // Add to type total
              typeMap.set(taskType, (typeMap.get(taskType) || 0) + minutes);

              // Add to daily data
              const dayKey = format(startTime, 'yyyy-MM-dd');
              if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, new Map());
              }
              const dayTypes = dailyMap.get(dayKey)!;
              dayTypes.set(taskType, (dayTypes.get(taskType) || 0) + minutes);
            }
          } catch (error) {
            console.error('Error parsing time entry:', error);
          }
        });
      });
    });

    // Convert to array format for charts
    const timeByType: TimeData[] = Array.from(typeMap.entries())
      .map(([type, minutes]) => ({
        type,
        minutes,
        hours: Math.round((minutes / 60) * 100) / 100
      }))
      .sort((a, b) => b.minutes - a.minutes);

    // Create daily data for stacked bar chart
    const dailyData: MonthlyData[] = [];
    const daysInMonth = endDate.getDate();
    const allTypes = new Set(timeByType.map(t => t.type));

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'yyyy-MM-dd');
      const dayData: MonthlyData = { day: day.toString() };

      const dayTypes = dailyMap.get(dayKey);
      allTypes.forEach(type => {
        dayData[type] = dayTypes ? Math.round((dayTypes.get(type) || 0) / 60 * 100) / 100 : 0;
      });

      dailyData.push(dayData);
    }

    const totalHours = timeByType.reduce((sum, item) => sum + item.hours, 0);

    return { timeByType, dailyData, totalHours };
  }, [data, currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const pieData = timeByType.map(item => ({
    name: item.type,
    value: item.hours,
    percentage: totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0
  }));

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <button className="close-analytics-btn" onClick={onClose}>
          ← カンバンボードに戻る
        </button>
        <div className="month-navigation">
          <button onClick={() => navigateMonth('prev')} className="month-nav-btn">
            <ChevronLeft size={20} />
          </button>
          <h2>{format(currentMonth, 'yyyy年M月', { locale: ja })}</h2>
          <button onClick={() => navigateMonth('next')} className="month-nav-btn">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="total-hours">
          合計: {totalHours.toFixed(1)}時間
        </div>
      </div>

      <div className="analytics-content">
        {timeByType.length === 0 ? (
          <div className="no-data">
            <p>この月のデータはありません</p>
          </div>
        ) : (
          <>
            <div className="chart-section">
              <h3>
                <BarChart3 size={20} />
                日別タスクタイプ時間（積み上げ）
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis label={{ value: '時間', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${value}時間`} />
                  <Legend />
                  {timeByType.map(({ type }) => (
                    <Bar
                      key={type}
                      dataKey={type}
                      stackId="a"
                      fill={generateColor(type)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>
                <PieChartIcon size={20} />
                タスクタイプ別時間配分
              </h3>
              <div className="pie-chart-container">
                <ResponsiveContainer width="50%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ percentage }) => `${percentage}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={generateColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}時間`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((item) => (
                    <div key={item.name} className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: generateColor(item.name) }}
                      />
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-value">{item.value}時間 ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};