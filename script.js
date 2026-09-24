const modal=document.querySelector("#modal");
const openButton=document.querySelector("#open");
const headerAI=document.querySelector(".header-ai");
const closeButton=document.querySelector("#close");
const backdrop=document.querySelector("#backdrop");

function openAI(e){ if(e) e.preventDefault(); modal?.classList.add("open"); }
function closeAI(){ modal?.classList.remove("open"); }

openButton?.addEventListener("click",openAI);
headerAI?.addEventListener("click",openAI);
closeButton?.addEventListener("click",closeAI);
backdrop?.addEventListener("click",closeAI);
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeAI(); });

document.querySelectorAll(".questions button").forEach(button=>{
  button.addEventListener("click",()=>{
    const answers={
      "Who are you?":"Rajdeep is a Data Science graduate focused on practical ML, analytics and GenAI products.",
      "Tell me about JobShield.":"JobShield is an AI job discovery and safety assistant built around risk signals, resume matching and improvement areas.",
      "What are your skills?":"Python, machine learning, data analytics, SQL, GenAI/LLMs and cloud technologies."
    };
    document.querySelector(".placeholder").textContent=answers[button.textContent] || "Ask me about Rajdeep's work.";
  });
});

const navLinks=[...document.querySelectorAll(".main-nav a")];
const sections=[...document.querySelectorAll("main section[id]")];

function updateActiveNav(){
  const headerHeight=document.querySelector('.site-header')?.offsetHeight || 76;
  const marker=window.scrollY + headerHeight + Math.min(window.innerHeight * 0.22, 180);
  let current="top";

  for(const section of sections){
    if(section.offsetTop <= marker) current=section.id;
  }

  navLinks.forEach(link=>{
    const href=link.getAttribute("href");
    const active=(current === "top" && href === "#top") || href === `#${current}`;
    link.classList.toggle("active",active);
  });
}

window.addEventListener("scroll",updateActiveNav,{passive:true});
window.addEventListener("resize",updateActiveNav);
updateActiveNav();
