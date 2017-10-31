const dpm = new DPM()
const acl = new ACLD()

function makeSetting(type) {
  return (deviceName) => {
    if (type === 'reset') {
      return () => acl.run(`reset ${deviceName}`)
    } else if (type === 'set') {
      return (event) => acl.run(`set ${deviceName} ${event.target.value}`)
    } else if (type === 'toggle') {
      return (event) => {
        if (event.target.value === 'ON') {
          acl.run(`off ${deviceName}`)
        } else if (event.target.value === 'OFF') {
          acl.run(`on ${deviceName}`)
        }
      }
    }
  }
}

function dataToTextcontent(id) {
  return (dpmData, dpmInfo) => {
    let display = Number(dpmData.data)

    if (isNaN(display)) {
      display = dpmData.data
    } else {
      display = `${display.toFixed(3)} ${dpmInfo.units}`
    }

    document.querySelector(`#${id}`).textContent = display
  }
}

function booleanToBackground(id) {
  return (dpmData, dpmInfo) => {
    const element = document.querySelector(`#${id}`)

    if (dpmData.data) {
      element.setAttribute('style', 'background-color:lime')
    } else {
      element.setAttribute('style', 'background-color:red')
    }
  }
}

function booleanToOnOff(id) {
  return (dpmData, dpmInfo) => {
    if (dpmData.data) {
      document.querySelector(`#${id}`).textContent = 'ON'
    } else {
      document.querySelector(`#${id}`).textContent = 'OFF'
    }
  }
}

function output(type) {
  return (id) => {
    if (type === 'text') {
      return dataToTextcontent(id)
    } else if (type === 'status') {
      return booleanToBackground(id)
    } else if (type === 'value') {
      return () => console.error("Beau hasn't implemented value")
    } else if (type === 'onOff') {
      return booleanToOnOff(id)
    }
  }
}

function updatePlot(svg, xScale, yScale, path) {
  return (dpmData, dpmInfo) => {
    const dataArray = new Float32Array(dpmData.data, 4 * 5)
    dataset = Array.from(dataArray)

    xScale.domain([0, dataset.length])
    yScale.domain([d3.min(dataset), d3.max(dataset)])

    svg.select('.path').remove()

    svg.append('path')
      .datum(dataset)
      .attr('class', 'path')
      .attr('d', path)

    svg.select('.xAxis')
      .call(d3.axisBottom(xScale))

    svg.select('.yAxis')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d3.format('.3f')))
  }
}

function draw(type) {
  return (id) => {
    const targetElement = document.querySelector(`#${id}`)
    const margin = {
      top: 10,
      right: 10,
      bottom: 20,
      left: 60
    }
    const width = targetElement.parentElement.clientWidth - margin.left - margin.right
    const height = (targetElement.parentElement.clientHeight * 2) - margin.top - margin.bottom

    const xScale = d3.scaleLinear()
      .range([0, width]) // output

    const yScale = d3.scaleLinear()
      .range([height, 0]) // output

    const path = d3.line()
      .x((d, i) => xScale(i)) // set the x values for the line generator
      .y((d) => yScale(d)) // set the y values for the line generator

    const svg = d3.select(targetElement)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Add the x Axis
    svg.append('g')
      .attr('class', 'xAxis')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))

    // text label for the x axis
    svg.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.top + 20})`)
      .style('text-anchor', 'middle')

    // Add the y Axis
    svg.append('g')
      .attr('class', 'yAxis')
      .call(d3.axisLeft(yScale))

    // text label for the y axis
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(svg.node().parentElement.dataset.label)

    if (type === 'line') {
      return updatePlot(svg, xScale, yScale, path)
    } else if (type === 'time') {
      return () => console.error("Beau hasn't implemented time plots yet.")
    }
  }
}

for (setting of settings) {
  const element = document.querySelector(`#${setting.id}`)

  element.addEventListener(
    setting.eventType,
    makeSetting(setting.type)(setting.device)
  )
}

for (request of requests) {
  if (request.hasOwnProperty('bit')) {
    dpm.addRequest(
      request.device,
      output(request.output)(request.id, {
        statusBit: request.bit
      })
    )
  } else {
    dpm.addRequest(request.device, output(request.output)(request.id))
  }

}

for (plot of plots) {
  dpm.addRequest(plot.device, draw(plot.type)(plot.id))
}

// window.addEventListener('resize', resizePlots)
dpm.start()