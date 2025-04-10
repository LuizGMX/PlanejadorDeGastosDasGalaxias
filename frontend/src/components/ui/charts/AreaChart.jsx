import React from 'react';
import * as d3 from 'd3';
import { Card } from "../card";

const AreaChart = ({
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
  gradientColors = [
    ['rgba(33, 150, 243, 0.8)', 'rgba(33, 150, 243, 0.1)']
  ],
  className = '',
  isMobile = false,
  onPointClick,
}) => {
  const svgRef = React.useRef(null);
  const tooltipRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(null);
  
  // Garantir que width e height são números
  const numericWidth = typeof width === 'number' ? width : parseInt(width) || 600;
  const numericHeight = typeof height === 'number' ? height : parseInt(height) || 400;

  React.useEffect(() => {
    // Verificar se temos dados válidos
    const dataArray = Array.isArray(data) ? data : [];
    if (dataArray.length === 0) return;

    try {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const chartWidth = numericWidth - margin.left - margin.right;
      const chartHeight = numericHeight - margin.top - margin.bottom;

      // Garantir valores válidos para os acessores
      const validData = dataArray.filter(d => {
        try {
          const x = xAccessor(d);
          const y = yAccessor(d);
          return x !== undefined && y !== undefined && !isNaN(y);
        } catch (e) {
          return false;
        }
      });

      if (validData.length === 0) return;

      // Função para obter valores X e verificar se podem ser convertidos para Date
      const getXValue = d => {
        const value = xAccessor(d);
        // Tentar converter para Date se for string ou número
        if (typeof value === 'string' || typeof value === 'number') {
          try {
            return new Date(value);
          } catch (e) {
            return value;
          }
        }
        return value;
      };

      // Escolher o tipo de escala apropriado para X
      const xScale = (function() {
        const values = validData.map(getXValue);
        // Verificar se os valores são datas
        if (values[0] instanceof Date) {
          return d3.scaleTime()
            .domain(d3.extent(values))
            .range([0, chartWidth]);
        }
        // Caso contrário, usar uma escala linear ou de banda conforme o tipo
        if (typeof values[0] === 'number') {
          return d3.scaleLinear()
            .domain(d3.extent(values))
            .range([0, chartWidth]);
        }
        // Para strings ou outros tipos
        return d3.scaleBand()
          .domain(values)
          .range([0, chartWidth])
          .padding(0.1);
      })();

      const yValues = validData.map(yAccessor).filter(v => !isNaN(v));
      const maxY = yValues.length > 0 ? Math.max(...yValues) * 1.1 : 100;

      const yScale = d3.scaleLinear()
        .domain([0, maxY])
        .range([chartHeight, 0]);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Add gradients
      const defs = svg.append("defs");
      gradientColors.forEach((colors, i) => {
        const gradient = defs
          .append("linearGradient")
          .attr("id", `area-gradient-${i}`)
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%")
          .attr("y2", "100%");

        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", colors[0]);

        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", colors[1]);
      });

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

      // Create area and line generator functions based on scale type
      const getX = d => {
        const value = getXValue(d);
        // Se for escala de banda, centralizar no meio da banda
        if (xScale.bandwidth) {
          return xScale(value) + xScale.bandwidth() / 2;
        }
        return xScale(value);
      };

      // Add area
      const area = d3.area()
        .x(getX)
        .y0(chartHeight)
        .y1(d => yScale(yAccessor(d)))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(validData)
        .attr("class", "area")
        .attr("d", area)
        .style("fill", `url(#area-gradient-0)`)
        .style("stroke", "none");

      // Add line
      const line = d3.line()
        .x(getX)
        .y(d => yScale(yAccessor(d)))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(validData)
        .attr("class", "line")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", colors[0])
        .style("stroke-width", 2);

      // Add points
      const points = g.selectAll(".point")
        .data(validData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", getX)
        .attr("cy", d => yScale(yAccessor(d)))
        .attr("r", 4)
        .style("fill", colors[0])
        .style("stroke", "white")
        .style("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 6);

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

          setActiveIndex(validData.indexOf(d));
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 4);

          if (showTooltip) {
            d3.select(tooltipRef.current)
              .style("opacity", 0);
          }

          setActiveIndex(null);
        })
        .on("click", function(event, d) {
          if (onPointClick) {
            onPointClick(d, validData.indexOf(d));
          }
        });
    } catch (error) {
      console.error("Erro ao renderizar AreaChart:", error);
    }
  }, [data, numericWidth, numericHeight, margin, xAccessor, yAccessor, xTickFormat, yTickFormat, colors, gradientColors, showGrid, showTooltip]);

  // Verificar se temos dados para exibir
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card className={`w-full p-4 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="relative">
        {!hasData ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center text-gray-400">
              Sem dados para exibir
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={numericWidth}
            height={numericHeight}
            className="w-full h-full"
            viewBox={`0 0 ${numericWidth} ${numericHeight}`}
            style={{ maxHeight: numericHeight }}
          />
        )}
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

export default AreaChart; 