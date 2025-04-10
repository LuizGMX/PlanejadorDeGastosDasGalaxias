import React from 'react';
import * as d3 from 'd3';
import { Card } from "@/components/ui/card";

const PieChart = ({
  data,
  width = 400,
  height = 400,
  innerRadius = 60,
  outerRadius = 100,
  colors = d3.schemeCategory10,
  title,
  subtitle,
  tooltipFormat = (value) => value,
  valueFormatter = (value) => value,
  labelFormatter = (label) => label,
  showLegend = true,
  isMobile = false,
  className = '',
  onSliceClick,
}) => {
  const svgRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(null);

  React.useEffect(() => {
    if (!data || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    const g = svg
      .append("g")
      .attr("transform", `translate(${chartWidth / 2},${chartHeight / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const arcs = g
      .selectAll(".arc")
      .data(pie(data))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .style("fill", (d, i) => colors[i % colors.length])
      .style("stroke", "white")
      .style("stroke-width", "2px")
      .style("transition", "all 0.3s ease")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", function(d) {
            const centroid = arc.centroid(d);
            const x = centroid[0] * 0.1;
            const y = centroid[1] * 0.1;
            return `translate(${x},${y})`;
          });

        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("opacity", 1)
          .html(`
            <div class="bg-background p-2 rounded-lg shadow-lg border border-border">
              <div class="font-semibold">${labelFormatter(d.data.name)}</div>
              <div>${tooltipFormat(d.data.value)}</div>
              <div>${((d.data.value / d3.sum(data, d => d.value)) * 100).toFixed(1)}%</div>
            </div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");

        setActiveIndex(d.index);
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("transform", "translate(0,0)");

        d3.select(tooltipRef.current)
          .style("opacity", 0);

        setActiveIndex(null);
      })
      .on("click", function(event, d) {
        if (onSliceClick) {
          onSliceClick(d.data, d.index);
        }
      });

    if (showLegend && !isMobile) {
      const legend = g
        .selectAll(".legend")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${outerRadius + 20},${i * 20 - data.length * 10})`);

      legend
        .append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", (d, i) => colors[i % colors.length]);

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 9)
        .text(d => labelFormatter(d.name))
        .style("font-size", "12px")
        .style("fill", "var(--text-color)");
    }

  }, [data, width, height, colors, innerRadius, outerRadius, tooltipFormat, labelFormatter, showLegend, isMobile]);

  return (
    <Card className={`w-full p-4 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
          style={{ maxHeight: height }}
        />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 z-50"
          style={{
            transition: "opacity 0.2s ease"
          }}
        />
      </div>
      {showLegend && isMobile && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, i) => (
            <div
              key={item.name}
              className={`flex items-center space-x-2 p-2 rounded ${
                activeIndex === i ? "bg-accent" : ""
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-sm truncate">
                {labelFormatter(item.name)}
              </span>
              <span className="text-sm text-muted-foreground ml-auto">
                {valueFormatter(item.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PieChart; 