paper.install(window)
paper.setup("canvas")

var drawingData = localStorage.getItem("touchProto")
var textData = localStorage.getItem("touchText")
var commandsData = localStorage.getItem("touchCommands")

if (drawingData != null) {
  project.clear()
  project.importJSON(JSON.parse(drawingData))
}

document.body.addEventListener("touchstart", null, { passive: false })
document.body.addEventListener("touchmove", null, { passive: false })
document.body.addEventListener("touchend", null, { passive: false })

$("#gui, #components, #commands, #colors").on("touchstart touchmove", function(e) {
  e.preventDefault()
})

$("#textInputField, #gui-top, #undo, #redo, #clear").on("touchmove", function(e) {
  e.preventDefault()
})

var globalColors = ["#303240", "#0033dd", "#ff83b4", "#ffbb44", "#66dddd"]
globalColors.forEach(function(val, idx) {
  document.documentElement.style.setProperty("--color-" + (idx + 1), val)
})

var grid = 20

function getCommands(id) {
  return $(id)
    .children()
    .map(function(idx, elem) {
      return {
        id: $(elem).data().cmd,
        color: $(elem).attr("data-color") != null ? $(elem).attr("data-color") : null
      }
    })
    .toArray()
}

function mapCommands(id, event) {
  let cmds = $(id)
    .children()
    .map(function(idx, elem) {
      return {
        id: $(elem).data().cmd,
        color: $(elem).attr("data-color") != null ? $(elem).attr("data-color") : null
      }
    })

  for (let cmd of cmds) {
    if (commands[cmd.id] != null) {
      if (cmd.color != null) {
        if (cmd.color == 6) {
          var newColor = globalColors[event.count % globalColors.length]
        } else {
          var newColor = globalColors[cmd.color - 1]
        }
      } else {
        var newColor = null
      }
      commands[cmd.id].cmd(event, newColor)
    }
  }
}

var tool = new Tool({ minDistance: 3 })
tool.prevDelta = 0
tool.currDelta = 0
tool.avgDelta = 0
tool.maxUndoLevels = 10
tool.history = {
  projects: [project.exportJSON(false)],
  index: 0
}

if (textData != null) {
  tool.text = textData
  $("#textInputField").val(textData)
}

//mouse event handling

function updateUndoButtons(tool) {
  $("#undo").css("opacity", tool.history.index > 0 && tool.history.projects.length > 0 ? 1 : 0.5)
  $("#redo").css("opacity", tool.history.index < tool.history.projects.length - 1 ? 1 : 0.5)
}

function handleUndoHistory(tool) {
  tool.history.projects.push(project.exportJSON(false))
  tool.history.index = Math.min(tool.history.index + 1, tool.history.projects.length - 1)
  if (tool.history.projects.length > 0 && tool.history.index < Math.max(0, tool.history.projects.length - 1)) {
    tool.history.projects.length = Math.max(1, tool.history.index)
    tool.history.projects.push(project.exportJSON(false))
    tool.history.index = tool.history.projects.length - 1
  } else if (tool.history.projects.length > tool.maxUndoLevels) {
    tool.history.projects.shift()
    tool.history.index = Math.max(0, tool.history.index - 1)
  }
}

tool.on({
  mousedown(e) {
    this.items = []
    this.speed = false
    this.snap = false
    this.randomize = false
    mapCommands("#commands", e)
    //this.history.projects.length = Math.max(0, this.history.index - 1)
  },
  mousedrag(e) {
    this.prevDelta = this.currDelta
    this.currDelta = e.delta.length
    this.avgDelta = Math.min(64, (this.prevDelta + this.currDelta) / 2)
    mapCommands("#commands", e)
    this.items.map(function(item) {
      item.data.drawing = true
    })
  },
  mouseup(e) {
    mapCommands("#commands", e)
    this.items.map(function(item) {
      item.data.drawing = null
    })
    this.items = []
    handleUndoHistory(this)
    updateUndoButtons(this)
    if (e.count % 10 == 0) localStorage.setItem("touchProto", JSON.stringify(project.exportJSON({ asString: true })))
  }
})

//build GUI

$("#components").append(
  Object.keys(commands).map(function(key, index) {
    let obj = commands[key]
    if (key != "color") {
      return `<li class="fas block ${obj.icon}" data-cmd="${key}"/>`
    }
  })
)

//colors
for (let i = 1; i <= globalColors.length + 1; i++) {
  $("#colors").append(`<li class="fas block color color-${i}" data-cmd="color" data-color="${i}"/>`)
}

//default tool

let createPath = $("#components li")
  .first()
  .clone()

createPath.attr("data-color", 1)
createPath.addClass("color-1 select")

$("#commands").append(createPath)

$(".color")
  .first()
  .addClass("select")

if (commandsData != null) {
  commandsData = JSON.parse(commandsData)

  $("#commands")
    .children()
    .each(function() {
      $(this).remove()
    })

  $("#commands").append(
    commandsData.map(function(entry, index) {
      let obj = commands[entry.id]
      return `<li class="fas block ${
        obj.icon
      } color-${entry.color}" data-cmd="${entry.id}" data-color="${entry.color}"/>`
    })
  )
}

//GUI drag & drop handling

$(".color").on("mousedown touchend", function(e) {
  e.preventDefault()
  $(".color").each(function(e) {
    $(this).removeClass("select")
  })
  $(this).addClass("select")
  let colorIdx = $(this).attr("data-color")
  let colorHex = globalColors[colorIdx]

  //if ($(".commands .select").length > 0) project.currentStyle.fillColor = colorHex

  $(".commands .select").each(function() {
    if (
      $(this)
        .data("cmd")
        .includes("create")
    ) {
      $(this).removeClass("color-1 color-2 color-3 color-4 color-5 color-6")
      $(this).addClass("color-" + colorIdx)
      $(this).attr("data-color", colorIdx)
    }
  })
})

$("#clear-canvas").click(function() {
  project.clear()
  handleUndoHistory(tool)
  updateUndoButtons(tool)
})

$("#undo").click(function() {
  tool.history.index = Math.max(0, tool.history.index - 1)
  project.clear()
  project.importJSON(tool.history.projects[tool.history.index])
  //logHistory()
  updateUndoButtons(tool)
})

$("#redo").click(function() {
  tool.history.index = Math.max(0, Math.min(tool.history.projects.length - 1, tool.history.index + 1))
  project.clear()
  project.importJSON(tool.history.projects[tool.history.index])
  //logHistory()
  updateUndoButtons(tool)
})

function logHistory() {
  console.log("i " + tool.history.index, "len " + tool.history.projects.length)
}

$(window).on("unload", function(event) {
  localStorage.setItem("touchProto", JSON.stringify(project.exportJSON({ asString: true })))
  localStorage.setItem("touchText", $("#textInputField").val())
  localStorage.setItem("touchCommands", JSON.stringify(getCommands("#commands")))
})

$("#textInputField").on("input", function(event) {
  tool.text = this.value
  localStorage.setItem("touchText", this.value)
})
