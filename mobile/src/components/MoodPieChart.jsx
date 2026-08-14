import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";

// Web-aligned vibrant color palette for all mood states
export const MOOD_COLORS = {
  happy: "#34d399",
  grateful: "#10b981",
  hopeful: "#f472b6",
  calm: "#a78bfa",
  excited: "#fbbf24",
  stressed: "#fb7185",
  anxious: "#fb923c",
  overwhelmed: "#f87171",
  sad: "#38bdf8",
  lonely: "#60a5fa",
  tired: "#94a3b8",
  angry: "#f97316",
  depressed: "#8b5cf6",
  neutral: "#94a3b8",
};

export const getMoodColor = (mood) => {
  const key = String(mood || "neutral").toLowerCase();
  return MOOD_COLORS[key] || MOOD_COLORS.neutral;
};

// Helper function: Calculate coordinates on circle circumference
const getCoordinatesForPercent = (percent, radius, center) => {
  // Start from top (12 o'clock, -90 degrees)
  const angle = percent * 2 * Math.PI - Math.PI / 2;
  const x = center + radius * Math.cos(angle);
  const y = center + radius * Math.sin(angle);
  return { x, y };
};

export const MoodPieChart = ({
  data = [], // Array of { mood: string, count: number, percent: number, color?: string }
  size = 190,
  strokeWidth = 24,
  centerBg = "#FFFFFF",
  iconColor = "#64748B",
  iconSize = 28,
  showCenterIcon = true,
  fallbackColor = "#E2E8F0",
}) => {
  const center = size / 2;
  const outerRadius = (size - 4) / 2;
  const innerRadius = Math.max(0, outerRadius - strokeWidth);

  // Compute total entries count
  const validData = (data || []).filter((item) => Number(item.count || 0) > 0);
  const totalCount = validData.reduce((sum, item) => sum + Number(item.count || 0), 0);

  // Case 1: No data available
  if (totalCount === 0 || validData.length === 0) {
    const ringRadius = (outerRadius + innerRadius) / 2;
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            stroke={fallbackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        {showCenterIcon && (
          <View
            style={[
              styles.centerCutout,
              {
                width: innerRadius * 2 - 4,
                height: innerRadius * 2 - 4,
                borderRadius: innerRadius,
                backgroundColor: centerBg,
              },
            ]}
          >
            <Feather name="smile" size={iconSize} color={iconColor} />
          </View>
        )}
      </View>
    );
  }

  // Case 2: Only one single mood (100% of the pie)
  if (validData.length === 1) {
    const singleColor = validData[0].color || getMoodColor(validData[0].mood);
    const ringRadius = (outerRadius + innerRadius) / 2;

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            stroke={singleColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        {showCenterIcon && (
          <View
            style={[
              styles.centerCutout,
              {
                width: innerRadius * 2 - 4,
                height: innerRadius * 2 - 4,
                borderRadius: innerRadius,
                backgroundColor: centerBg,
              },
            ]}
          >
            <Feather name="smile" size={iconSize} color={iconColor} />
          </View>
        )}
      </View>
    );
  }

  // Case 3: Multiple slices — generate SVG donut arc paths
  let cumulativePercent = 0;
  const slices = validData.map((item) => {
    const slicePercent = Number(item.count || 0) / totalCount;
    const startPercent = cumulativePercent;
    const endPercent = cumulativePercent + slicePercent;
    cumulativePercent = endPercent;

    const startOuter = getCoordinatesForPercent(startPercent, outerRadius, center);
    const endOuter = getCoordinatesForPercent(endPercent, outerRadius, center);
    const endInner = getCoordinatesForPercent(endPercent, innerRadius, center);
    const startInner = getCoordinatesForPercent(startPercent, innerRadius, center);

    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
      `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
      `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
      `A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
      "Z",
    ].join(" ");

    const color = item.color || getMoodColor(item.mood);

    return {
      mood: item.mood,
      pathData,
      color,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {slices.map((slice, index) => (
            <Path
              key={`${slice.mood}-${index}`}
              d={slice.pathData}
              fill={slice.color}
              stroke={centerBg}
              strokeWidth={1.5}
            />
          ))}
        </G>
      </Svg>
      {showCenterIcon && (
        <View
          style={[
            styles.centerCutout,
            {
              width: innerRadius * 2 - 4,
              height: innerRadius * 2 - 4,
              borderRadius: innerRadius,
              backgroundColor: centerBg,
            },
          ]}
        >
          <Feather name="smile" size={iconSize} color={iconColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerCutout: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
});

export default MoodPieChart;
