import React from 'react';
import * as d3 from 'd3';
import { Card } from "@/components/ui/card";

const BarChart = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 30, bottom: 30, left: 60 },
  xAccessor = d => d.x,
  yAccessor = d => d.y,
  xTickFormat = d => d,
  yTickFormat = d => d,
  title,
  subtitle,
  showTooltip = true,
  showGrid = true,
  showLegend = true,
  colors = ['#2196F3'],
  className = '',
  isMobile = false,
  onBarClick,
}) => {
  const svgRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(null);

  React.useEffect(() => {
    if (!data || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(data.map(xAccessor))
      .range([0, chartWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, yAccessor) * 1.1])
      .range([chartHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid
    if (showGrid) {
      g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(
          d3.axisBottom(xScale)
            .tickSize(-chartHeight)
            .tickFormat("")
        )
        .style("stroke", "var(--border)")
        .style("stroke-opacity", 0.2);

      g.append("g")
        .attr("class", "grid")
        .call(
          d3.axisLeft(yScale)
            .tickSize(-chartWidth)
            .tickFormat("")
        )
        .style("stroke", "var(--border)")
        .style("stroke-opacity", 0.2);
    }

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(xTickFormat))
      .style("color", "var(--text-color)");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(yTickFormat))
      .style("color", "var(--text-color)");

    // Add bars
    const bars = g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(xAccessor(d)))
      .attr("y", d => yScale(yAccessor(d)))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight - yScale(yAccessor(d)))
      .style("fill", colors[0])
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 0.8);

        if (showTooltip) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("opacity", 1)
            .html(`
              <div class="bg-background p-2 rounded-lg shadow-lg border border-border">
                <div class="font-semibold">${xTickFormat(xAccessor(d))}</div>
                <div>${yTickFormat(yAccessor(d))}</div>
              </div>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        }

        setActiveIndex(data.indexOf(d));
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1);

        if (showTooltip) {
          d3.select(tooltipRef.current)
            .style("opacity", 0);
        }

        setActiveIndex(null);
      })
      .on("click", function(event, d) {
        if (onBarClick) {
          onBarClick(d, data.indexOf(d));
        }
      });

  }, [data, width, height, margin, xAccessor, yAccessor, xTickFormat, yTickFormat, colors, showGrid, showTooltip]);

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
    </Card>
  );
};

export default BarChart; 