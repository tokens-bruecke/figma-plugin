// clear console on reload
console.clear();

// default plugin size
const pluginFrameSize = {
  width: 340,
  height: 370,
};

// show plugin UI
figma.showUI(__html__, pluginFrameSize);

// listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  const isSomethingSelected = figma.currentPage.selection.length !== 0;

  if (msg.type === "add-outline") {
    if (isSomethingSelected) {
      console.log(msg);

      const selection = figma.currentPage.selection;

      selection.forEach((node: FrameNode) => {
        node.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
        node.strokeWeight = Number(msg.value);
        node.strokeAlign = "OUTSIDE";
        node.strokeCap = "ROUND";
        node.strokeJoin = "ROUND";
      });
    } else {
      figma.notify("Select a node first");
    }
  }
};
