import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const [works, setWorks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin modal and authentication state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('jithin_admin_authed') === 'true');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [editingId, setEditingId] = useState(null); // Tracks item being edited
  const [adminTitle, setAdminTitle] = useState('');
  const [adminCategory, setAdminCategory] = useState('AD CREATIVES');
  const [adminType, setAdminType] = useState('image');
  const [adminFileUrl, setAdminFileUrl] = useState('');
  const [adminFileData, setAdminFileData] = useState('');
  const [adminDescription, setAdminDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // Filter category state
  const [visibleCount, setVisibleCount] = useState(9); // Limit items shown initially
  const [lightboxItem, setLightboxItem] = useState(null); // Tracks item being viewed in lightbox
 
  // CV management states
  const [activeAdminTab, setActiveAdminTab] = useState('works');
  const [cvUrl, setCvUrl] = useState('/cv.pdf');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [cvFileData, setCvFileData] = useState('');
  const [isSubmittingCv, setIsSubmittingCv] = useState(false);
 
  // Refs for cursor
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const timelineVideoRef = useRef(null);
 
  // Helper to convert base64 to Blob URL for safe browser viewing
  const base64ToBlobUrl = (dataStr) => {
    if (dataStr && dataStr.startsWith('data:')) {
      try {
        const parts = dataStr.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        return URL.createObjectURL(blob);
      } catch (e) {
        console.error('Error converting base64 to blob', e);
        return dataStr;
      }
    }
    return dataStr;
  };

  // Fetch CV from database
  const fetchCv = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cv`);
      if (res.ok) {
        const data = await res.json();
        if (data.fileData) {
          setCvUrl(base64ToBlobUrl(data.fileData));
          setCvFileData(data.fileData);
        } else if (data.fileUrl) {
          setCvUrl(data.fileUrl);
          setCvFileUrl(data.fileUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching CV:', err);
    }
  };

  const handleCvFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvFileData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCvSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingCv(true);

    try {
      const res = await fetch(`${API_BASE}/api/cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: cvFileData, fileUrl: cvFileUrl })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.fileData) {
          setCvUrl(base64ToBlobUrl(data.fileData));
        } else if (data.fileUrl) {
          setCvUrl(data.fileUrl);
        }
        alert('CV updated successfully!');
        setIsAdminOpen(false);
      } else {
        alert('Failed to update CV.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating CV.');
    } finally {
      setIsSubmittingCv(false);
    }
  };

  // Fetch works from database
  const fetchWorks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/works`);
      if (res.ok) {
        let data = await res.json();
        // If empty database, call seed route to populate initial works
        if (data.length === 0) {
          await fetch(`${API_BASE}/api/works/seed`, { method: 'POST' });
          const seededRes = await fetch(`${API_BASE}/api/works`);
          data = await seededRes.json();
        }
        setWorks(data);
      }
    } catch (err) {
      console.error('Error fetching works:', err);
    }
  };

  useEffect(() => {
    fetchWorks();
    fetchCv();
  }, []);

  // Reset visible items count when category changes
  useEffect(() => {
    setVisibleCount(9);
  }, [selectedCategory]);

  // Custom Cursor mousemove listener
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = `${e.clientX}px`;
        cursorDotRef.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId;
    const animateCursor = () => {
      const distX = mousePos.current.x - ringPos.current.x;
      const distY = mousePos.current.y - ringPos.current.y;
      
      ringPos.current.x += distX * 0.15;
      ringPos.current.y += distY * 0.15;
      
      if (cursorRingRef.current) {
        cursorRingRef.current.style.left = `${ringPos.current.x}px`;
        cursorRingRef.current.style.top = `${ringPos.current.y}px`;
      }
      
      animationFrameId = requestAnimationFrame(animateCursor);
    };
    animateCursor();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // IntersectionObserver to handle timeline video audio based on scroll position
  useEffect(() => {
    const video = timelineVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reset video to the beginning and play unmuted
          video.currentTime = 0;
          video.muted = false;
          video.play().catch(err => {
            console.log("Audio play blocked by browser, falling back to muted:", err);
            // Fallback to muted playback if audio is blocked
            video.muted = true;
            video.play().catch(playErr => {
              console.error("Muted playback failed:", playErr);
            });
          });
        } else {
          // Pause and mute video when out of view so it's primed for a fresh start next time
          video.pause();
          video.muted = true;
        }
      },
      { 
        threshold: 0,
        rootMargin: "100px 0px 100px 0px" // Trigger 100px before entering/exiting viewport to eliminate any delay
      }
    );

    const section = document.getElementById('experience');
    if (section) {
      observer.observe(section);
    }

    return () => {
      if (section) {
        observer.unobserve(section);
      }
    };
  }, [works]);

  // GSAP animations and Preloader sequence
  useEffect(() => {
    // Only run animations once works are loaded
    if (works.length === 0) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setIsLoading(false)
      });

      tl.to(".preloader-j", { y: 0, duration: 0.8, ease: "bounce.out" })
        .to(".preloader-k", { y: 0, duration: 0.8, ease: "bounce.out" }, "-=0.4")
        .to(".preloader-line", { x: "0%", duration: 0.8, ease: "power4.inOut" })
        .to(".preloader-subtitle", { opacity: 1, duration: 0.5 })
        .to("#preloader", { yPercent: -100, duration: 1, ease: "power4.inOut", delay: 1.5 })
        .to("#navbar", { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
        .from(".hero-content > *", { y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, "-=0.5")
        .from(".hero-image", { x: 40, opacity: 0, duration: 1, ease: "power3.out" }, "-=0.8");

      // Parallax Hero Watermark
      gsap.to("#hero-watermark", {
        yPercent: 50,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-content",
          start: "top center",
          end: "bottom top",
          scrub: true
        }
      });

      // Section Reveals
      gsap.utils.toArray('.section-reveal').forEach(section => {
        gsap.fromTo(section, 
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 100%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });

      // Skill Bars Animate on Scroll
      gsap.utils.toArray('.skill-bar-fill').forEach(bar => {
        gsap.to(bar, {
          width: bar.getAttribute('data-width'),
          duration: 1.5,
          ease: "power4.out",
          scrollTrigger: {
            trigger: bar,
            start: "top 90%",
          }
        });
      });

      // Specialized About Section Animations
      const aboutTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#about",
          start: "top 75%",
        }
      });

      aboutTl.from(".about-fade-up", { y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" })
             .from(".about-title-line", { yPercent: 100, duration: 0.8, stagger: 0.1, ease: "power4.out" }, "-=0.4")
             .from(".about-para", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }, "-=0.4")
             .from(".about-skill-item", { x: 30, opacity: 0, duration: 0.6, stagger: 0.05, ease: "power3.out" }, "-=0.4")
             .from(".about-tool-tag", { scale: 0.5, opacity: 0, duration: 0.5, stagger: 0.05, ease: "back.out(2)" }, "-=0.4");

      // Animate award card independently to prevent blocking issues
      gsap.from(".award-card", {
        scale: 0.8,
        opacity: 0,
        rotationX: 15,
        duration: 0.8,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ".award-card",
          start: "top 90%"
        }
      });

      // Experience Timeline Animations
      gsap.to(".exp-title", {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#experience",
          start: "top 75%"
        }
      });

      gsap.to(".exp-line", {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "#experience .relative",
          start: "top 70%",
          end: "bottom 50%",
          scrub: 0.5
        }
      });

      gsap.utils.toArray(".exp-item").forEach((item) => {
        gsap.to(item, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 85%"
          }
        });
      });

      // Credentials Timeline Animations
      gsap.to(".cert-title", {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cert-title",
          start: "top 80%"
        }
      });

      gsap.utils.toArray(".cert-item").forEach((item) => {
        gsap.to(item, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 85%"
          }
        });
      });

      // Refresh ScrollTrigger after a short delay for React rendering layout shifts
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 500);
    });
    return () => ctx.revert();
  }, [works]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setAdminTitle('');
    setAdminCategory('AD CREATIVES');
    setAdminType('image');
    setAdminFileUrl('');
    setAdminFileData('');
    setAdminDescription('');
  };

  const handleEditSelect = (work) => {
    setEditingId(work._id);
    setAdminTitle(work.title);
    setAdminCategory(work.category);
    setAdminType(work.type);
    setAdminFileUrl(work.fileUrl || '');
    setAdminFileData(work.fileData || '');
    setAdminDescription(work.description || '');
  };

  const handleDeleteWork = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/works/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('Work deleted successfully!');
        fetchWorks();
      } else {
        alert('Failed to delete work.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting work.');
    }
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcodeInput === '1000' || passcodeInput === 'admin' || passcodeInput === 'jithin1000') {
      setIsAuthenticated(true);
      localStorage.setItem('jithin_admin_authed', 'true');
      setPasscodeError(false);
      setPasscodeInput('');
    } else {
      setPasscodeError(true);
    }
  };

  const handleAdminLock = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('jithin_admin_authed');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminFileData(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWork = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      title: adminTitle,
      category: adminCategory,
      type: adminType,
      fileData: adminFileData,
      fileUrl: adminFileUrl,
      description: adminDescription
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`${API_BASE}/api/works/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/api/works`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        alert(editingId ? 'Project updated successfully!' : 'Project published successfully!');
        handleCancelEdit();
        setIsAdminOpen(false);
        fetchWorks();
      } else {
        alert('Failed to save project.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWorkMedia = (work) => {
    const src = work.fileData || work.fileUrl;
    if (work.type === 'video') {
      if (src && (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo'))) {
        return (
          <iframe
            src={src}
            className="w-full h-full object-cover"
            title={work.title}
            allowFullScreen
          />
        );
      }
      return (
        <video
          src={src}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      );
    }
    return (
      <img
        src={src}
        alt={work.title}
        className="w-full h-full object-cover"
      />
    );
  };
  const renderWorkItem = (work, isShort) => {
    return (
      <div 
        key={work._id} 
        className={`gallery-marquee-item ${isShort ? 'short' : 'tall'} hoverable cursor-pointer`}
        onClick={() => setLightboxItem(work)}
      >
        {renderWorkMedia(work)}
        <div className="portfolio-overlay">
          <div className="text-white/85 text-xs font-bold uppercase tracking-widest mb-2">{work.category}</div>
          <h3 className="font-bebas text-4xl tracking-widest">{work.title}</h3>
        </div>
      </div>
    );
  };

  const buildMarqueeLayout = (filteredItems) => {
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-sm font-medium">
          No works found in this category.
        </div>
      );
    }

    // Duplicate list to make sure we have enough items for seamless scrolling marquee
    let items = [...filteredItems];
    while (items.length < 12) {
      items = [...items, ...filteredItems];
    }

    const structure = [];
    let i = 0;
    while (i < items.length) {
      if (structure.length % 2 === 0) {
        structure.push({ type: 'tall', media: items[i] });
        i += 1;
      } else {
        if (i + 1 < items.length) {
          structure.push({
            type: 'column',
            items: [items[i], items[i + 1]]
          });
          i += 2;
        } else {
          structure.push({ type: 'tall', media: items[i] });
          i += 1;
        }
      }
    }

    const renderStructure = (structList, keyPrefix) => {
      return structList.map((item, index) => {
        if (item.type === 'tall') {
          return (
            <React.Fragment key={`${keyPrefix}-tall-${index}`}>
              {renderWorkItem(item.media, false)}
            </React.Fragment>
          );
        } else if (item.type === 'column') {
          return (
            <div key={`${keyPrefix}-col-${index}`} className="gallery-marquee-column">
              {renderWorkItem(item.items[0], true)}
              {renderWorkItem(item.items[1], true)}
            </div>
          );
        }
        return null;
      });
    };

    return (
      <div className="gallery-marquee-wrapper">
        <div className="gallery-marquee-content">
          {renderStructure(structure, 'set1')}
          {renderStructure(structure, 'set2')}
        </div>
      </div>
    );
  };

  const matchesCategory = (work, selectedCat) => {
    if (selectedCat === 'ALL') return true;
    const cat = work.category.toUpperCase();
    const sel = selectedCat.toUpperCase();
    
    if (sel === 'POSTERS') {
      return cat.includes('POSTER') || cat.includes('POSTERS');
    }
    if (sel === 'HORDINGS') {
      return cat.includes('HORDING') || cat.includes('HORDINGS');
    }
    if (sel === 'LOGO DESIGN') {
      return cat.includes('LOGO');
    }
    return cat === sel;
  };

  const renderNormalGrid = (filteredItems) => {
    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-20 text-gray-500 uppercase tracking-widest text-sm font-medium">
          No works found in this category.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(work => (
          <div 
            key={work._id}
            onClick={() => setLightboxItem(work)}
            className="portfolio-card hoverable cursor-pointer h-[340px]"
          >
            {renderWorkMedia(work)}
            <div className="portfolio-overlay">
              <div className="text-white/85 text-xs font-bold uppercase tracking-widest mb-2">{work.category}</div>
              <h3 className="font-bebas text-4xl tracking-widest">{work.title}</h3>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen text-white font-outfit overflow-x-hidden bg-bg">
      <div className="noise-overlay"></div>
      
      {/* Custom Cursor */}
      <div className="cursor-dot hidden md:block" ref={cursorDotRef}></div>
      <div className="cursor-ring hidden md:block" ref={cursorRingRef}></div>

      {/* Preloader */}
      <div id="preloader">
        <div className="preloader-letters">
          <span className="preloader-j">J</span>
          <span className="preloader-k">K</span>
        </div>
        <div className="preloader-line-wrapper">
          <div className="preloader-line"></div>
        </div>
        <div className="preloader-subtitle">Jithin Krishnan · Portfolio</div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 opacity-0 invisible" id="navbar">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <a href="#" className="font-bebas text-3xl tracking-wider flex items-end">
            J<span className="text-accent">.</span>K
          </a>
          <div className="flex gap-8 items-center text-sm font-medium tracking-widest uppercase">
            <div className="hidden md:flex gap-8">
              <a href="#about" className="hover:text-accent transition-colors">About</a>
              <a href="#experience" className="hover:text-accent transition-colors">Experience</a>
              <a href="#work" className="hover:text-accent transition-colors">Work</a>
              <a href="#contact" className="hover:text-accent transition-colors">Contact</a>
            </div>
            
            {/* View CV Button */}
            <a 
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              className="hoverable text-xs font-semibold px-4 py-2 border border-white/20 text-white hover:border-accent hover:text-accent transition-all duration-300 rounded-full flex items-center gap-2"
            >
              <i className="fa-solid fa-file-pdf"></i> View CV
            </a>

            {/* Manage Portfolio Action */}
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="hoverable text-xs font-semibold px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-white transition-all duration-300 rounded-full flex items-center gap-2"
            >
              <i className="fa-solid fa-folder-plus"></i> Upload Work
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="watermark" id="hero-watermark">DESIGN</div>
        
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center z-10">
          <div className="space-y-8 hero-content">
            <div className="flex items-center gap-4">
              <div className="w-12 h-[2px] bg-accent"></div>
              <span className="uppercase tracking-widest text-sm text-gray-400 font-medium">Available for Projects</span>
            </div>
            
            <h1 className="font-bebas text-[5rem] md:text-[7rem] leading-[0.85] tracking-wide">
              JITHIN <br />
              <span className="text-accent">KRISHNAN</span>
            </h1>
            
            <div className="space-y-4 max-w-lg">
              <h2 className="text-xl md:text-2xl font-light text-gray-300">Graphic Designer · Video Editor</h2>
              <p className="text-gray-400 leading-relaxed font-light">
                Creative and detail-oriented Graphic Designer with 1+ year of professional experience. Based in Palakkad, Kerala, specializing in social media creatives, brochures, branding materials, and promotional video editing.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6 pt-4">
              <a href="#work" className="px-8 py-4 bg-accent text-white font-medium hover:bg-white hover:text-bg transition-colors duration-300">View My Work</a>
              <a href="#contact" className="px-8 py-4 border border-white/20 font-medium hover:border-accent hover:text-accent transition-colors duration-300">Let's Talk</a>
              <a href={cvUrl} target="_blank" rel="noreferrer" className="px-8 py-4 border border-white/20 font-medium hover:border-accent hover:text-accent transition-colors duration-300 flex items-center gap-2">
                <i className="fa-solid fa-file-pdf"></i> View CV
              </a>
            </div>
          </div>

          <div className="relative hero-image hidden lg:block">
            <div className="image-frame w-[400px] h-[550px] ml-auto">
              <img src="/img.png" alt="Jithin Krishnan" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
              
              <div className="absolute -bottom-10 -left-10 bg-[#111] border border-white/10 p-5 rounded-sm flex items-center gap-4 shadow-2xl animate-[pulse_3s_ease-in-out_infinite]">
                <span className="text-accentSec text-2xl"><i className="fa-solid fa-star"></i></span>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Award Winner</p>
                  <p className="font-bebas text-xl tracking-wider">Best Performer 2025</p>
                </div>
              </div>

              <div className="absolute top-10 -right-16 bg-[#111] border border-white/10 px-5 py-3 flex flex-col items-center">
                <span className="font-bebas text-3xl text-accent">1+</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Yrs Exp</span>
              </div>

              <div className="absolute top-32 -right-10 bg-[#111] border border-white/10 px-5 py-3 flex flex-col items-center">
                <span className="font-bebas text-3xl text-white">50+</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Projects</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-wrapper border-y border-white/5 opacity-0 section-reveal">
        <div className="marquee-content font-bebas text-xl md:text-3xl tracking-widest text-gray-500">
          Social Media Design <span className="diamond">◆</span> 
          Branding & Identity <span class="diamond">◆</span> 
          Video Editing <span className="diamond">◆</span> 
          Hoarding Designs <span className="diamond">◆</span> 
          App Banners <span className="diamond">◆</span> 
          Brochures <span className="diamond">◆</span> 
          Social Media Design <span className="diamond">◆</span> 
          Branding & Identity <span className="diamond">◆</span> 
          Video Editing <span className="diamond">◆</span> 
          Hoarding Designs <span className="diamond">◆</span> 
          App Banners <span className="diamond">◆</span> 
          Brochures <span className="diamond">◆</span> 
        </div>
      </div>

      {/* About Section */}
      <section id="about" className="pt-40 pb-20 px-6 relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/5 to-transparent pointer-events-none -z-10"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accentSec/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto glass-panel rounded-3xl p-10 md:pt-24 md:px-24 md:pb-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 relative z-10">
            {/* Left Column */}
            <div className="space-y-10">
              <div className="about-fade-up inline-flex items-center gap-3 border border-accent/30 bg-accent/5 text-accent text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full">
                <i className="fa-solid fa-user-astronaut"></i> About The Creator
              </div>
              
              <h2 className="font-bebas text-5xl md:text-7xl tracking-wide leading-none">
                <div className="about-text-mask"><span className="about-title-line block">The Story</span></div>
                <div className="about-text-mask"><span className="about-title-line block">Behind The <span className="text-accent">Work</span></span></div>
              </h2>
              
              <div className="space-y-6 text-gray-400 font-light leading-relaxed text-lg">
                <p className="about-para"><i className="fa-solid fa-quote-left text-accentSec/30 text-2xl mr-3"></i>Creative and detail-oriented Graphic Designer with 1+ year of professional experience in digital marketing and visual content creation. Currently working at <strong>Inspite Technologies, Infopark Kochi</strong>, specializing in social media creatives, brochures, hoarding designs, app banners, branding materials, and promotional video editing.</p>
                <p className="about-para">Skilled in creating modern, visually engaging, and marketing-focused designs that improve audience engagement and brand visibility. Proficient in Adobe Photoshop, Illustrator, InDesign, Premiere Pro, and Canva with strong expertise in digital advertising, layout design, and visual communication.</p>
                <p className="about-para">Experienced in managing multiple creative projects within deadline-driven environments while maintaining high-quality design standards and client satisfaction. Also actively working as a freelance Graphic Designer and Video Editor for brands, startups, and businesses.</p>
              </div>


            </div>

            {/* Right Column (Skills & Tools) */}
            <div className="space-y-16">
              {/* Skills */}
              <div className="space-y-8">
                <h3 className="about-fade-up font-bebas text-4xl tracking-widest flex items-center gap-3">
                  <i className="fa-solid fa-chart-pie text-accent"></i> Core Competencies
                </h3>
                
                <div className="space-y-6">
                  {/* Graphic Design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-palette text-accent mr-2"></i>Graphic Design</span>
                      <span className="text-accent">98%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="98%"></div></div>
                  </div>
                  {/* Video Editing */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-video text-accent mr-2"></i>Video Editing</span>
                      <span className="text-accent">95%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="95%"></div></div>
                  </div>
                  {/* Social Media Poster Design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-image text-accent mr-2"></i>Social Media Poster Design</span>
                      <span className="text-accent">93%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="93%"></div></div>
                  </div>
                  {/* LOGO design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-bezier-curve text-accent mr-2"></i>LOGO design</span>
                      <span className="text-accent">91%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="91%"></div></div>
                  </div>
                  {/* branding */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-fingerprint text-accent mr-2"></i>branding</span>
                      <span className="text-accent">90%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="90%"></div></div>
                  </div>
                  {/* Hoarding Design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-ad text-accent mr-2"></i>Hoarding Design</span>
                      <span className="text-accent">88%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="88%"></div></div>
                  </div>
                  {/* Brochure Design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-book-open text-accent mr-2"></i>Brochure Design</span>
                      <span className="text-accent">87%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="87%"></div></div>
                  </div>
                  {/* App Banner Design */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-flag text-accent mr-2"></i>App Banner Design</span>
                      <span className="text-accent">86%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="86%"></div></div>
                  </div>
                  {/* Branding & Visual Identity */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-signature text-accent mr-2"></i>Branding & Visual Identity</span>
                      <span className="text-accent">85%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="85%"></div></div>
                  </div>
                  {/* Print & Digital Advertising */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-bullhorn text-accent mr-2"></i>Print & Digital Advertising</span>
                      <span className="text-accent">83%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="83%"></div></div>
                  </div>
                  {/* Creative Concept Development */}
                  <div className="about-skill-item">
                    <div className="flex justify-between text-sm uppercase tracking-widest mb-3 font-medium">
                      <span><i className="fa-solid fa-lightbulb text-accent mr-2"></i>Creative Concept Development</span>
                      <span className="text-accent">80%</span>
                    </div>
                    <div className="skill-bar-bg rounded-full h-2"><div className="skill-bar-fill rounded-full" data-width="80%"></div></div>
                  </div>
                </div>
              </div>

              {/* Tools */}
              <div className="space-y-8">
                <h3 className="about-fade-up font-bebas text-4xl tracking-widest flex items-center gap-3">
                  <i className="fa-solid fa-layer-group text-accent"></i> Software Stack
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-brands fa-adobe mr-2 text-accent"></i>Photoshop</div>
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-brands fa-adobe mr-2 text-accent"></i>Illustrator</div>
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-brands fa-adobe mr-2 text-accent"></i>InDesign</div>
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-solid fa-video mr-2 text-accent"></i>Premiere Pro</div>
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-solid fa-clapperboard mr-2 text-accent"></i>CapCut</div>
                  <div className="about-tool-tag tool-tag border border-white/10 rounded-lg px-6 py-4 text-sm font-medium uppercase tracking-widest bg-white/5 backdrop-blur-md shadow-lg"><i className="fa-solid fa-pen-nib mr-2 text-accent"></i>Canva</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section id="experience" className="py-32 px-6 overflow-hidden relative isolate">
        {/* Timeline Background Video (Starting from Center to Right on desktop, full-screen on mobile) */}
        <div className="absolute top-0 right-0 left-0 lg:left-1/2 bottom-0 pointer-events-none overflow-hidden -z-10 opacity-15 lg:opacity-20 filter contrast-110 brightness-75 blur-[1px]">
          <video
            ref={timelineVideoRef}
            src="/brand.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Fades to blend with black background */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-transparent to-bg lg:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg"></div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <h2 className="exp-title font-bebas text-5xl md:text-6xl tracking-wide text-center mb-20 opacity-0 transform translate-y-10">
            Professional <span className="text-accent">Timeline</span>
          </h2>

          <div className="relative pl-8 md:pl-0">
            <div className="timeline-line md:left-1/2 md:-ml-[1px] exp-line scale-y-0 origin-top"></div>

            {/* Exp 1 */}
            <div className="exp-item relative mb-16 md:w-1/2 md:pr-16 text-left group opacity-0 translate-y-10">
              <div className="timeline-dot md:left-auto md:right-[-12px] transition-transform duration-300 group-hover:scale-125 flex items-center justify-center">
                <i className="fa-solid fa-circle-dot text-[8px] text-accent"></i>
              </div>
              <div className="text-accent text-sm font-bold uppercase tracking-widest mb-2"><i className="fa-solid fa-calendar-days mr-2"></i>April 2025 – Present</div>
              <h3 className="font-bebas text-3xl tracking-widest mb-1">Graphic Designer</h3>
              <p className="text-gray-400 font-medium mb-4"><i className="fa-solid fa-building mr-2"></i>Inspite Technologies – Infopark Kochi</p>
              <ul className="space-y-2 text-gray-500 font-light">
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Recognized with the Best Performer Award 2025 for outstanding creative performance and contribution to client projects.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Designed social media posters, digital advertisements, and marketing creatives for multiple clients.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Created brochures, hoarding designs, flyers, app banners, and promotional graphics for digital and print campaigns.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Edited reels, promotional videos, and advertisement content for social media platforms.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Collaborated with marketing teams to develop creative campaign concepts and visual strategies.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Delivered high-quality visual content within deadlines while ensuring client satisfaction.</li>
              </ul>
            </div>

            {/* Exp 2 */}
            <div className="exp-item relative mb-16 md:w-1/2 md:ml-auto md:pl-16 text-left group opacity-0 translate-y-10">
              <div className="timeline-dot md:left-[-12px] transition-transform duration-300 group-hover:scale-125 flex items-center justify-center">
                <i className="fa-solid fa-circle-dot text-[8px] text-accent"></i>
              </div>
              <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2"><i className="fa-solid fa-calendar-days mr-2"></i>3-Month Internship</div>
              <h3 className="font-bebas text-3xl tracking-widest mb-1">Graphic Design Intern</h3>
              <p className="text-gray-400 font-medium mb-4"><i className="fa-solid fa-building mr-2"></i>Zed Soft Tech, Malappuram, Tirur</p>
              <ul className="space-y-2 text-gray-500 font-light">
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Assisted in creating social media creatives, promotional posters, and marketing materials.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Supported branding and visual design projects for businesses and startups.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Worked on video editing and digital content creation for social media campaigns.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Collaborated with senior designers to execute creative concepts and campaign visuals.</li>
              </ul>
            </div>

            {/* Exp 3 */}
            <div className="exp-item relative md:w-1/2 md:pr-16 text-left group opacity-0 translate-y-10">
              <div className="timeline-dot md:left-auto md:right-[-12px] transition-transform duration-300 group-hover:scale-125 flex items-center justify-center">
                <i className="fa-solid fa-circle-dot text-[8px] text-accent"></i>
              </div>
              <div className="text-accent text-sm font-bold uppercase tracking-widest mb-2"><i className="fa-solid fa-calendar-days mr-2"></i>Ongoing</div>
              <h3 className="font-bebas text-3xl tracking-widest mb-1">Freelance Graphic Designer & Video Editor</h3>
              <p className="text-gray-400 font-medium mb-4"><i className="fa-solid fa-laptop-house mr-2"></i>Independent</p>
              <ul className="space-y-2 text-gray-500 font-light">
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Designed logos, social media creatives, brochures, banners, and promotional materials for various clients.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Created promotional videos, reels, and advertisement content for businesses and digital platforms.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Assisted startups and local brands in developing strong visual identities and creative marketing materials.</li>
                <li className="flex items-start gap-3"><i class="fa-solid fa-caret-right text-accent mt-1"></i> Delivered modern and trend-focused design solutions tailored to client requirements.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="py-32 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-6 section-reveal">
          <h2 className="font-bebas text-5xl md:text-6xl tracking-wide mb-8">
            Selected <span className="text-accent">Works</span>
          </h2>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 mb-12">
            {['ALL', 'POSTERS', 'AD CREATIVES', 'BROUCHERS', 'HORDINGS', 'LOGO DESIGN', 'BRANDING', 'VIDEOS'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`hoverable px-5 py-2 text-xs font-semibold tracking-wider uppercase border transition-all duration-300 rounded-full ${
                  selectedCategory === cat
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-white/10 text-gray-400 hover:border-white hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Content */}
        {selectedCategory === 'ALL' ? (
          <div className="w-full">
            {buildMarqueeLayout(works)}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6">
            {renderNormalGrid(works.filter(work => matchesCategory(work, selectedCategory)))}
          </div>
        )}
      </section>

      {/* Certifications Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="cert-title font-bebas text-5xl md:text-6xl tracking-wide mb-16 text-center opacity-0 translate-y-10">
            Education & <span className="text-accent">Credentials</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div 
              onClick={() => setLightboxItem({
                title: "Best Performer Award 2025",
                category: "AWARDS",
                type: "image",
                fileUrl: "/award.jpeg",
                description: "Awarded for outstanding creative contributions and consistent excellence at Inspite Technologies, Infopark Kochi."
              })}
              className="cert-item opacity-0 translate-y-10 glass-panel p-8 rounded-2xl flex items-center gap-6 hoverable group border-l-4 border-l-accentSec hover:-translate-y-2 transition-all duration-300 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-accentSec/10 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-trophy text-3xl text-accentSec group-hover:scale-110 transition-transform"></i>
              </div>
              <div>
                <h4 className="font-bebas text-2xl tracking-widest text-accentSec mb-1">Best Performer Award 2025</h4>
                <p className="text-gray-400 text-sm"><i className="fa-solid fa-building mr-2"></i>Inspite Technologies, Infopark Kochi</p>
              </div>
            </div>

            <div className="cert-item opacity-0 translate-y-10 glass-panel p-8 rounded-2xl flex items-center gap-6 hoverable group border-l-4 border-l-white/10 hover:border-l-accent hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-certificate text-3xl text-white group-hover:text-accent transition-colors"></i>
              </div>
              <div>
                <h4 className="font-bebas text-2xl tracking-widest mb-1 group-hover:text-accent transition-colors">Graphic Designing & Video Editing</h4>
                <p className="text-gray-400 text-sm"><i className="fa-solid fa-certificate mr-2"></i>Avoda Edutech Private Limited, Kochi (2024)</p>
              </div>
            </div>

            <div className="cert-item opacity-0 translate-y-10 glass-panel p-8 rounded-2xl flex items-center gap-6 hoverable group border-l-4 border-l-white/10 hover:border-l-accent hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-building-columns text-3xl text-white group-hover:text-accent transition-colors"></i>
              </div>
              <div>
                <h4 className="font-bebas text-2xl tracking-widest mb-1 group-hover:text-accent transition-colors">Higher Secondary (Plus Two)</h4>
                <p className="text-gray-400 text-sm"><i className="fa-solid fa-award mr-2"></i>Board of Higher Secondary Examinations, Kerala (2018)</p>
              </div>
            </div>

            <div className="cert-item opacity-0 translate-y-10 glass-panel p-8 rounded-2xl flex items-center gap-6 hoverable group border-l-4 border-l-white/10 hover:border-l-accent hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-book-open text-3xl text-white group-hover:text-accent transition-colors"></i>
              </div>
              <div>
                <h4 className="font-bebas text-2xl tracking-widest mb-1 group-hover:text-accent transition-colors">SSLC</h4>
                <p className="text-gray-400 text-sm"><i className="fa-solid fa-school mr-2"></i>Board of Public Examination, Kerala (2016)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-40 px-6 bg-[#080808] border-t border-white/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center section-reveal relative z-10">
          <h2 className="font-bebas text-6xl md:text-8xl tracking-wide mb-6">
            LET'S WORK <span className="text-accent">TOGETHER</span>
          </h2>
          <p className="text-gray-400 font-light text-lg md:text-xl mb-16">
            Ready to elevate your visual identity? <br />
            <span className="text-sm mt-2 block text-gray-500"><i className="fa-solid fa-earth-asia mr-2"></i>Speaking English, Malayalam & Tamil</span>
          </p>

          <div className="flex flex-col md:flex-row flex-wrap justify-center gap-12 md:gap-16 lg:gap-20 mb-16">
            <div className="space-y-4 hoverable group cursor-pointer">
              <div className="w-16 h-16 rounded-full glass-panel mx-auto flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                <i className="fa-solid fa-envelope text-accent text-2xl group-hover:scale-125 transition-transform duration-300"></i>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Email</div>
              <div className="font-medium text-lg">jithinkrishnan1000@gmail.com</div>
            </div>
            <div className="space-y-4 hoverable group cursor-pointer">
              <div className="w-16 h-16 rounded-full glass-panel mx-auto flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                <i className="fa-solid fa-phone text-accent text-2xl group-hover:scale-125 transition-transform duration-300"></i>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Phone</div>
              <div className="font-medium text-lg">+91 8075773025</div>
            </div>
            <div className="space-y-4 hoverable group cursor-pointer">
              <div className="w-16 h-16 rounded-full glass-panel mx-auto flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                <i className="fa-solid fa-location-dot text-accent text-2xl group-hover:scale-125 transition-transform duration-300"></i>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Location</div>
              <div className="font-medium text-lg">Palakkad, Kerala</div>
            </div>
            <a href="https://www.instagram.com/gra_phicwaves?igsh=aGtiMDM5ZWVuejBr&utm_source=ig_contact_invite" target="_blank" rel="noreferrer" className="space-y-4 hoverable group cursor-pointer block">
              <div className="w-16 h-16 rounded-full glass-panel mx-auto flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                <i className="fa-brands fa-instagram text-accent text-2xl group-hover:scale-125 transition-transform duration-300"></i>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-gray-500">Instagram</div>
              <div className="font-medium text-lg hover:text-accent transition-colors">@gra_phicwaves</div>
            </a>
          </div>

          <a href="mailto:jithinkrishnan1000@gmail.com" className="inline-flex items-center gap-4 bg-white text-bg px-10 py-5 font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-colors duration-300 hoverable rounded-full">
            Send a Message <i className="fa-solid fa-arrow-right text-xl"></i>
          </a>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-accent/10 rounded-full blur-[120px] -z-0"></div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/5 text-center md:text-left flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto text-sm text-gray-500 uppercase tracking-widest font-medium">
        <div className="font-bebas text-2xl tracking-wider text-white mb-4 md:mb-0">
          J<span className="text-accent">.</span>K
        </div>
        <div>
          © 2026 JITHIN KRISHNAN. DESIGNED WITH PRECISION.
        </div>
        <div className="mt-4 md:mt-0">
          PALAKKAD, KERALA
        </div>
      </footer>

      {/* WhatsApp Floating Icon */}
      <a href="https://wa.me/918075773025" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[9000] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center text-3xl shadow-lg hover:bg-[#20bd5a] hover:scale-110 transition-all duration-300 hoverable">
        <i className="fa-brands fa-whatsapp"></i>
      </a>

      {/* Admin Upload Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl relative">
            <button 
              onClick={() => {
                setIsAdminOpen(false);
                handleCancelEdit();
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-white text-xl hoverable"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {!isAuthenticated ? (
              /* Lock Screen Form */
              <div className="py-8 text-center max-w-sm mx-auto space-y-6">
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto text-accent text-3xl">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <div>
                  <h3 className="font-bebas text-3xl tracking-wider mb-2 text-white">Admin Access Only</h3>
                  <p className="text-sm text-gray-400 font-light">Please enter your passcode to manage the portfolio works.</p>
                </div>
                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <input 
                    type="password" 
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    className="w-full text-center bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                    placeholder="Enter Passcode"
                    required
                  />
                  {passcodeError && (
                    <p className="text-xs text-red-500 font-medium">Incorrect passcode. Please try again.</p>
                  )}
                  <button 
                    type="submit"
                    className="w-full py-3 bg-accent text-white font-medium hover:bg-white hover:text-bg transition-colors duration-300 uppercase tracking-widest text-xs font-bold"
                  >
                    Unlock Panel
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                  <div className="flex gap-6">
                    <button 
                      onClick={() => setActiveAdminTab('works')}
                      className={`font-bebas text-2xl tracking-wider pb-1 border-b-2 transition-all duration-300 focus:outline-none ${activeAdminTab === 'works' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                      Manage Portfolio
                    </button>
                    <button 
                      onClick={() => setActiveAdminTab('cv')}
                      className={`font-bebas text-2xl tracking-wider pb-1 border-b-2 transition-all duration-300 focus:outline-none ${activeAdminTab === 'cv' ? 'border-accent text-accent' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                      Manage CV
                    </button>
                  </div>
                  <button 
                    onClick={handleAdminLock}
                    className="text-xs font-semibold px-3 py-1 border border-white/20 text-gray-400 hover:text-white hover:border-white transition-all duration-300 rounded"
                  >
                    <i className="fa-solid fa-lock mr-1"></i> Lock
                  </button>
                </div>

                {activeAdminTab === 'works' ? (
                  <>
                    {/* List and manage existing items */}
                    <div className="mb-8 border-b border-white/10 pb-6">
                      <h4 className="font-bebas text-xl text-gray-300 tracking-wider mb-4">Manage Current Works ({works.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {works.map(work => (
                          <div key={work._id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                            <div>
                              <p className="font-semibold text-sm">{work.title}</p>
                              <p className="text-xs text-gray-400">{work.category} ({work.type})</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditSelect(work)}
                                className="text-accent hover:text-white px-2 py-1 text-sm bg-white/5 rounded border border-white/5 transition-colors"
                              >
                                <i className="fa-solid fa-pen-to-square"></i> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteWork(work._id)}
                                className="text-red-500 hover:text-red-400 p-2 text-sm"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Form (Add or Edit) */}
                    <form onSubmit={handleAddWork} className="space-y-5">
                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Work Title</label>
                        <input 
                          type="text" 
                          value={adminTitle}
                          onChange={(e) => setAdminTitle(e.target.value)}
                          className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                          placeholder="e.g. Nike Brand Design Concept"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Category</label>
                          <select
                            value={adminCategory}
                            onChange={(e) => setAdminCategory(e.target.value)}
                            className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                          >
                            <option value="AD CREATIVES">AD CREATIVES</option>
                            <option value="VIDEOS">VIDEOS</option>
                            <option value="BROUCHERS">BROUCHERS</option>
                            <option value="BRANDING">BRANDING</option>
                            <option value="HORDINGS DESIGNS">HORDINGS DESIGNS</option>
                            <option value="SOCIAL MEDIA CREATIVES">SOCIAL MEDIA CREATIVES</option>
                            <option value="SPECIAL DAYS POSTER">SPECIAL DAYS POSTER</option>
                            <option value="OTHER">OTHER</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Type</label>
                          <select
                            value={adminType}
                            onChange={(e) => setAdminType(e.target.value)}
                            className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                          >
                            <option value="image">Image File</option>
                            <option value="doc">Document (PDF)</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Upload File (Image/PDF)</label>
                        <input 
                          type="file" 
                          onChange={handleFileChange}
                          accept="image/*,application/pdf"
                          className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Converts file to Base64 stored in database.</p>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">OR External Link (Image/Video/PDF URL)</label>
                        <input 
                          type="text" 
                          value={adminFileUrl}
                          onChange={(e) => setAdminFileUrl(e.target.value)}
                          className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                          placeholder="https://example.com/asset.jpg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Description</label>
                        <textarea 
                          value={adminDescription}
                          onChange={(e) => setAdminDescription(e.target.value)}
                          className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors h-24 resize-none"
                          placeholder="Tell a story behind the project..."
                        />
                      </div>

                      <div className="pt-4 flex gap-4">
                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="px-8 py-4 bg-accent text-white font-medium hover:bg-white hover:text-bg transition-colors duration-300 flex-1 uppercase tracking-widest text-sm font-semibold"
                        >
                          {isSubmitting ? 'Saving...' : editingId ? 'Update Project' : 'Publish Project'}
                        </button>
                        {editingId && (
                          <button 
                            type="button" 
                            onClick={handleCancelEdit}
                            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-medium transition-colors duration-300 uppercase tracking-widest text-sm"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsAdminOpen(false);
                            handleCancelEdit();
                          }}
                          className="px-8 py-4 border border-white/20 hover:border-white text-white font-medium transition-colors duration-300 uppercase tracking-widest text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <form onSubmit={handleCvSubmit} className="space-y-6">
                    <div>
                      <h4 className="font-bebas text-xl text-gray-300 tracking-wider mb-2">Upload or Set Jithin's CV</h4>
                      <p className="text-xs text-gray-400 font-light mb-4">Upload Jithin's CV as a PDF file, or specify an external URL link.</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">Upload PDF File</label>
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={handleCvFileChange}
                        className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-medium">OR External PDF Link</label>
                      <input 
                        type="url" 
                        value={cvFileUrl}
                        onChange={(e) => setCvFileUrl(e.target.value)}
                        placeholder="https://example.com/jithin_cv.pdf"
                        className="w-full bg-[#141414] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                      />
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button 
                        type="submit" 
                        disabled={isSubmittingCv}
                        className="px-8 py-4 bg-accent text-white font-medium hover:bg-white hover:text-bg transition-colors duration-300 flex-1 uppercase tracking-widest text-sm font-semibold"
                      >
                        {isSubmittingCv ? 'Saving CV...' : 'Update CV'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAdminOpen(false);
                        }}
                        className="px-8 py-4 border border-white/20 hover:border-white text-white font-medium transition-colors duration-300 uppercase tracking-widest text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* Lightbox Modal for viewing work */}
      {lightboxItem && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-md">
          <button 
            onClick={() => setLightboxItem(null)}
            className="absolute top-6 right-6 text-gray-400 hover:text-white text-3xl hoverable z-50 focus:outline-none"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="max-w-5xl w-full flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/50">
              {lightboxItem.type === 'doc' ? (
                <iframe 
                  src={lightboxItem.fileData || lightboxItem.fileUrl}
                  className="w-[90vw] md:w-[70vw] h-[70vh] rounded-lg"
                  title={lightboxItem.title}
                />
              ) : lightboxItem.type === 'video' ? (
                (lightboxItem.fileData || lightboxItem.fileUrl).includes('youtube.com') || (lightboxItem.fileData || lightboxItem.fileUrl).includes('youtu.be') || (lightboxItem.fileData || lightboxItem.fileUrl).includes('vimeo') ? (
                  <iframe
                    src={lightboxItem.fileData || lightboxItem.fileUrl}
                    className="w-[90vw] md:w-[70vw] h-[50vh] rounded-lg"
                    title={lightboxItem.title}
                    allowFullScreen
                  />
                ) : (
                  <video 
                    src={lightboxItem.fileData || lightboxItem.fileUrl}
                    className="max-h-[70vh] rounded-lg"
                    controls
                    autoPlay
                  />
                )
              ) : (
                <img 
                  src={lightboxItem.fileData || lightboxItem.fileUrl} 
                  alt={lightboxItem.title} 
                  className="max-h-[75vh] object-contain rounded-lg"
                />
              )}
            </div>

            <div className="max-w-2xl px-4 mt-2">
              <span className="text-accent text-xs font-bold uppercase tracking-widest px-3 py-1 border border-accent/35 rounded-full bg-accent/5">
                {lightboxItem.category}
              </span>
              <h3 className="font-bebas text-3xl tracking-wide text-white mt-4">{lightboxItem.title}</h3>
              {lightboxItem.description && (
                <p className="text-gray-400 text-sm font-light leading-relaxed mt-2">
                  {lightboxItem.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
