const PdfPrinter=require("pdfmake");
const fonts=require("pdfmake/build/vfs_fonts.js");
async function createPdf(text,title="NEXUS Belgesi"){
 if(typeof text!=="string"||!text.trim()||text.length>24000)throw Error("Invalid document");
 const vfs=fonts.pdfMake?.vfs||fonts;
 const font=(name)=>Buffer.from(vfs[name],"base64");
 const printer=new PdfPrinter({Roboto:{normal:font("Roboto-Regular.ttf"),bold:font("Roboto-Medium.ttf"),italics:font("Roboto-Italic.ttf"),bolditalics:font("Roboto-MediumItalic.ttf")}});
 const doc=printer.createPdfKitDocument({pageSize:"A4",pageMargins:[44,48,44,52],info:{title:String(title).slice(0,100),creator:"NEXUS"},defaultStyle:{font:"Roboto",fontSize:11,lineHeight:1.2},content:[{text:String(title).slice(0,100),fontSize:20,bold:true,margin:[0,0,0,16]},...text.split("\n").slice(0,500).map(line=>({text:line||" ",margin:[0,0,0,3]}))],footer:(page,total)=>({text:page+" / "+total,alignment:"right",margin:[0,14,44,0],fontSize:9,color:"#64748b"})});
 return new Promise((resolve,reject)=>{let size=0;const chunks=[];doc.on("data",chunk=>{size+=chunk.length;if(size>12*1024*1024){doc.destroy();reject(Error("PDF too large"));return;}chunks.push(chunk)});doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);doc.end()});
}
module.exports={createPdf};
