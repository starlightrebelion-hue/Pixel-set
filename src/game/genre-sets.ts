export type GenreId = "drama" | "comedy" | "romance" | "noir" | "horror" | "science-fiction" | "fantasy" | "western" | "adventure";
export const GENRE_SETS: Record<GenreId, { label: string; palette: [string,string,string] }> = {
 drama:{label:"Drama",palette:["#4a382e","#b08a62","#e0c69a"]},
 comedy:{label:"Comedia",palette:["#42634a","#e5b85d","#f1dfb9"]},
 romance:{label:"Romance",palette:["#70465b","#d69b91","#f0d5bd"]},
 noir:{label:"Policial / Noir",palette:["#202b3c","#596b80","#d6b36c"]},
 horror:{label:"Terror",palette:["#202b25","#52604b","#9b8763"]},
 "science-fiction":{label:"Ciencia ficción",palette:["#142c40","#287f91","#9be3d0"]},
 fantasy:{label:"Fantasía",palette:["#49345e","#9872a5","#d9bd83"]},
 western:{label:"Western",palette:["#805333","#c18b50","#e5c68d"]},
 adventure:{label:"Aventura",palette:["#355d4d","#9b9b56","#d5b477"]},
};
const RULES: Array<[GenreId,string[]]> = [
 ["science-fiction",["nave","robot","espacio","futuro","laboratorio","alien"]],
 ["western",["western","saloon","vaquero","desierto","sheriff","tren"]],
 ["fantasy",["dragón","dragon","castillo","magia","hechizo","reino"]],
 ["horror",["silencio","terror","fantasma","monstruo","miedo","oscuro","asesino"]],
 ["noir",["traición","lluvia","detective","policía","policia","crimen","investigación","investigacion","callejón","callejon"]],
 ["romance",["reencuentro","amor","pareja","beso","romance","cita","enamor"]],
 ["comedy",["comedia","absurdo","confusión","confusion","chiste"]],
 ["adventure",["jungla","selva","expedición","expedicion","tesoro","aventura"]],
];
export function inferGenreFromScript(title:string, synopsis=""):GenreId {
 const text=(title+" "+synopsis).toLocaleLowerCase("es");
 for(const [genre,words] of RULES) if(words.some(word=>text.includes(word))) return genre;
 return "drama";
}
export function drawGenreSet(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,genre:GenreId) {
 const palette=GENRE_SETS[genre].palette; ctx.save();
 ctx.globalAlpha=genre==="drama"?.07:.18; ctx.fillStyle=palette[0]; ctx.fillRect(x,y,w,h);
 ctx.globalAlpha=.72;
 if(genre==="noir"){
  ctx.fillStyle="#111827";ctx.fillRect(x+w*.08,y+h*.08,w*.84,h*.22);
  for(let i=0;i<8;i++){const bx=x+w*(.12+i*.1);ctx.fillStyle=i%2?"#d7bd83":"#263449";ctx.beginPath();ctx.moveTo(bx,y+h*.1);ctx.lineTo(bx+w*.035,y+h*.1);ctx.lineTo(bx+w*.12,y+h*.42);ctx.lineTo(bx+w*.085,y+h*.42);ctx.fill();}
 } else if(genre==="science-fiction"){
  ctx.strokeStyle=palette[2];ctx.lineWidth=Math.max(2,w*.004);
  for(let i=0;i<5;i++){const px=x+w*(.12+i*.18);ctx.strokeRect(px,y+h*.12,w*.12,h*.13);ctx.fillStyle=i%2?"#4dd5d0":"#6aa8ff";ctx.fillRect(px+w*.018,y+h*.15,w*.084,h*.025);}
 } else if(genre==="horror"){
  ctx.fillStyle="#080d0b";ctx.globalAlpha=.32;ctx.fillRect(x,y,w,h);
  ctx.fillStyle="#9ca88a";ctx.globalAlpha=.16;for(let i=0;i<7;i++)ctx.fillRect(x+w*(i/7),y+h*.62,w*.08,h*.18);
 } else if(genre==="western"){
  ctx.fillStyle="#e8b96f";ctx.globalAlpha=.2;ctx.fillRect(x,y,w,h*.38);
  ctx.fillStyle="#5a3823";ctx.globalAlpha=.8;ctx.fillRect(x+w*.08,y+h*.18,w*.18,h*.24);ctx.fillRect(x+w*.74,y+h*.2,w*.16,h*.28);
 } else if(genre==="fantasy"){
  ctx.fillStyle="#c7a3ff";ctx.globalAlpha=.6;for(let i=0;i<18;i++){const px=x+w*((i*37%97)/100),py=y+h*((i*23%79)/100);ctx.fillRect(px,py,Math.max(2,w*.004),Math.max(2,w*.004));}
 } else if(genre==="romance"){
  ctx.fillStyle="#e9a7b7";ctx.globalAlpha=.12;ctx.fillRect(x,y,w,h);ctx.fillStyle="#f2d4a7";ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(x+w*.82,y+h*.18,w*.07,0,Math.PI*2);ctx.fill();
 } else if(genre==="comedy"){
  ctx.fillStyle="#f3d47a";ctx.globalAlpha=.12;ctx.fillRect(x,y,w,h);ctx.fillStyle="#f4d06f";ctx.globalAlpha=.75;for(let i=0;i<5;i++)ctx.fillRect(x+w*(.12+i*.17),y+h*.12,w*.1,h*.025);
 } else if(genre==="adventure"){
  ctx.fillStyle="#3c6b4c";ctx.globalAlpha=.22;for(let i=0;i<6;i++){const px=x+w*(i*.18);ctx.beginPath();ctx.moveTo(px,y+h*.65);ctx.lineTo(px+w*.09,y+h*.2);ctx.lineTo(px+w*.18,y+h*.65);ctx.fill();}
 }
 ctx.restore();
}
