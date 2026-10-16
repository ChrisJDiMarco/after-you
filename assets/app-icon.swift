import AppKit
let target = CommandLine.arguments[1]
let size = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
let outer = NSBezierPath(roundedRect: NSRect(x: 60, y: 60, width: 904, height: 904), xRadius: 205, yRadius: 205)
let shadow = NSShadow(); shadow.shadowColor = NSColor.black.withAlphaComponent(0.28); shadow.shadowBlurRadius = 28; shadow.shadowOffset = NSSize(width: 0, height: -10)
NSGraphicsContext.saveGraphicsState(); shadow.set()
NSColor(calibratedRed: 0.23, green: 0.16, blue: 0.12, alpha: 1).setFill(); outer.fill()
NSGraphicsContext.restoreGraphicsState()
let inset = NSBezierPath(roundedRect: NSRect(x: 101, y: 101, width: 822, height: 822), xRadius: 168, yRadius: 168)
NSGradient(starting: NSColor(calibratedRed: 0.95, green: 0.93, blue: 0.86, alpha: 1), ending: NSColor(calibratedRed: 0.80, green: 0.79, blue: 0.73, alpha: 1))!.draw(in: inset, angle: -70)
let amber = NSColor(calibratedRed: 0.88, green: 0.43, blue: 0.12, alpha: 1)
let blue = NSColor(calibratedRed: 0.20, green: 0.48, blue: 0.60, alpha: 1)
for (x,y,color) in [(169.0, 787.0, amber), (787.0, 169.0, amber), (169.0, 169.0, blue), (787.0, 787.0, blue)] {
    NSColor(calibratedWhite: 0.14, alpha: 1).setFill(); NSBezierPath(ovalIn: NSRect(x:x-35,y:y-35,width:70,height:70)).fill()
    color.setFill(); NSBezierPath(ovalIn: NSRect(x:x-25,y:y-25,width:50,height:50)).fill()
}
func arrow(_ start: NSPoint, _ end: NSPoint, _ color: NSColor) {
    let p = NSBezierPath(); p.lineWidth = 25; p.lineCapStyle = .round
    p.move(to: start); p.line(to: end); color.setStroke(); p.stroke()
    let sign: CGFloat = end.x > start.x ? 1 : -1
    let head = NSBezierPath(); head.lineWidth = 25; head.lineCapStyle = .round; head.lineJoinStyle = .round
    head.move(to: NSPoint(x: end.x-sign*53, y:end.y+53)); head.line(to: end); head.line(to:NSPoint(x:end.x-sign*53,y:end.y-53)); head.stroke()
}
arrow(NSPoint(x:350,y:626),NSPoint(x:726,y:626),amber)
arrow(NSPoint(x:674,y:398),NSPoint(x:298,y:398),blue)
for (x,y) in [(350.0,626.0),(674.0,398.0)] {
    let puck = NSBezierPath(ovalIn: NSRect(x:x-75,y:y-75,width:150,height:150))
    NSGraphicsContext.saveGraphicsState(); let s=NSShadow(); s.shadowColor=NSColor.black.withAlphaComponent(0.35); s.shadowBlurRadius=16;s.shadowOffset=NSSize(width:8,height:-13);s.set();NSColor.darkGray.setFill();puck.fill();NSGraphicsContext.restoreGraphicsState()
    NSGradient(starting:NSColor(calibratedWhite:1,alpha:1),ending:NSColor(calibratedWhite:0.42,alpha:1))!.draw(in:puck,angle:-55)
    let ring=NSBezierPath(ovalIn:NSRect(x:x-58,y:y-58,width:116,height:116));ring.lineWidth=2;NSColor(calibratedWhite:0.40,alpha:0.6).setStroke();ring.stroke()
    let dimple=NSBezierPath(ovalIn:NSRect(x:x-10,y:y-10,width:20,height:20));NSColor(calibratedWhite:0.45,alpha:0.55).setFill();dimple.fill()
}
image.unlockFocus()
let rep = NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:target))
