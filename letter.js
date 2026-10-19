/**
 * ====================================================================
 * MODULE: GIAO DIỆN PHONG BÌ & BỨC THƯ CHÚC MỪNG 20/10 (LETTER.JS)
 * Phong cách: Romantic Cosmic Wine Red & Ivory Gold
 * ====================================================================
 * Trách nhiệm:
 * 1. Khởi tạo phong thư màu đỏ rượu vang, nắp gấp CSS, con dấu sáp 3D hoa hồng.
 * 2. Xử lý tương tác nhấn vào con dấu:
 *    - Con dấu phát sáng nhẹ.
 *    - Nắp phong thư từ từ lật mở 180 độ (rotateX), kiểm soát z-index không xuyên nắp.
 *    - Lá thư màu trắng kem trượt lên từ bên trong phong bì, nghiêng nhẹ -2.8 độ rồi ổn định.
 *    - Ảnh đại diện hình tròn, tiêu đề viết tay "Chúc mừng ngày 20/10" xuất hiện theo trình tự mềm mại.
 *    - Lời chúc 60 chữ xuất hiện mượt mà bằng hiệu ứng máy đánh chữ nhịp nhàng.
 *    - Dòng chữ ký "From: ♡" và nút đọc lại thư xuất hiện cuối cùng.
 * 3. Chống nhấp liên tục (anti-spam clicking) trong lúc animation đang chạy.
 * 4. Tương thích 100% với luồng điều phối của main.js (LetterModule.init, LetterModule.show).
 */

(function () {
  'use strict';

  // Tham chiếu các phần tử DOM
  let letterScreenEl = null;
  let envelopeWrapperEl = null;
  let envelopeFlapEl = null;
  let waxSealEl = null;
  let letterCardEl = null;
  let closeBtn = null;
  let bodyTextEl = null;
  let typingCursorEl = null;
  let signatureAreaEl = null;
  let signatureNameEl = null;
  let replayBtn = null;
  let actionsFooterEl = null;
  let floatingQuoteEl = null;
  let particlesContainerEl = null;

  // Trạng thái vận hành
  let isEnvelopeOpened = false;
  let isAnimating = false;
  let isTyping = false;
  let typewriterTimeout = null;

  /**
   * Cấu hình nội dung bức thư chúc mừng 20/10
   * Giữ nguyên lời chúc ~60 chữ chuẩn xác theo thiết kế tham khảo
   */
  const LETTER_CONFIG = {
    // Tiêu đề viết tay
    title: 'Chúc mừng ngày 20/10',

    // Nội dung lời chúc (khoảng 60 chữ trang trọng, ngọt ngào, giàu cảm xúc)
    body: `Nhân ngày 20/10, chúc bạn luôn mạnh mẽ khi cần, dịu dàng khi muốn và hạnh phúc trong từng khoảnh khắc của cuộc sống. Mong rằng mọi nỗ lực của bạn đều được trân trọng, mọi ước mơ đều có cơ hội nở hoa. Hãy luôn tự tin, vì bạn xứng đáng với những điều tốt đẹp nhất. 🌷💖✨`,

    // Chữ ký cuối thư kèm icon trái tim
    signature: 'From: An',

    // Tốc độ gõ chữ mỗi ký tự (milliseconds)
    typingSpeed: 38,
  };

  const LetterModule = {
    name: 'LetterModule',
    isInitialized: false,

    /**
     * Khởi tạo các phần tử DOM và đăng ký sự kiện
     */
    init: function () {
      letterScreenEl = document.getElementById('letter-screen');
      envelopeWrapperEl = document.getElementById('envelope-wrapper');
      envelopeFlapEl = document.getElementById('envelope-flap');
      waxSealEl = document.getElementById('wax-seal');
      letterCardEl = document.getElementById('letter-card');
      closeBtn = document.getElementById('letter-close-btn');
      bodyTextEl = document.getElementById('letter-body-text');
      typingCursorEl = document.getElementById('typing-cursor');
      signatureAreaEl = document.getElementById('letter-signature-area');
      signatureNameEl = document.getElementById('letter-signature-name');
      replayBtn = document.getElementById('letter-replay-btn');
      actionsFooterEl = document.getElementById('letter-actions-footer');
      floatingQuoteEl = document.querySelector('.letter-floating-quote');
      particlesContainerEl = document.getElementById('letter-particles');

      if (!letterScreenEl || !envelopeWrapperEl || !letterCardEl) {
        console.warn('[LetterModule] Không tìm thấy các phần tử DOM cần thiết cho phong thư.');
        return false;
      }

      // Gán nội dung chữ ký ban đầu
      if (signatureNameEl) {
        signatureNameEl.textContent = LETTER_CONFIG.signature;
      }

      // Đăng ký sự kiện mở thư khi nhấn vào con dấu hoặc phong bì
      const handleOpenTrigger = (e) => {
        if (e) e.stopPropagation();
        this.handleOpenEnvelope();
      };

      if (waxSealEl) {
        waxSealEl.addEventListener('click', handleOpenTrigger);
        waxSealEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleOpenEnvelope();
          }
        });
      }

      // Nhấn vào phong bì: nếu chưa mở thì mở; nếu đã mở mà đang thu nhỏ thì đưa ra giữa màn hình
      envelopeWrapperEl.addEventListener('click', () => {
        if (!isEnvelopeOpened && !isAnimating) {
          this.handleOpenEnvelope();
        } else if (isEnvelopeOpened && letterCardEl && !letterCardEl.classList.contains('is-reading')) {
          this.openReadingMode();
        }
      });

      envelopeWrapperEl.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isAnimating) {
          e.preventDefault();
          if (!isEnvelopeOpened) {
            this.handleOpenEnvelope();
          } else if (letterCardEl && !letterCardEl.classList.contains('is-reading')) {
            this.openReadingMode();
          }
        }
      });

      // Nhấn vào lá thư: nếu thư đang thu nhỏ, nhấn vào sẽ đưa ra chế độ đọc toàn màn hình
      letterCardEl.addEventListener('click', (e) => {
        if (isEnvelopeOpened && !letterCardEl.classList.contains('is-reading')) {
          e.stopPropagation();
          this.openReadingMode();
        }
      });

      // Đăng ký sự kiện nút đóng/thu nhỏ thư
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeReadingMode();
        });
      }

      // Đăng ký sự kiện nút "Đọc lại thư ↺"
      if (replayBtn) {
        replayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.replay();
        });
      }

      // Tạo các hạt sáng và cánh hoa bồng bềnh trong không gian
      this.initFloatingParticles();

      this.isInitialized = true;
      console.info('[LetterModule] Đã khởi tạo thành công module Phong Thư & Bức Thư 20/10.');
      return true;
    },

    /**
     * Kích hoạt hiển thị Màn hình Phong Thư & Bức Thư (chuyển tiếp từ Quả cầu 3D)
     */
    show: function () {
      if (!letterScreenEl) return;

      console.info('[LetterModule] Kích hoạt hiển thị màn hình Phong Thư 20/10.');
      letterScreenEl.classList.remove('fade-out');
      letterScreenEl.classList.add('active');
      letterScreenEl.removeAttribute('aria-hidden');

      // Tự động focus vào phong bì để hỗ trợ điều khiển bàn phím và khả năng tiếp cận
      if (!isEnvelopeOpened && envelopeWrapperEl) {
        setTimeout(() => {
          if (envelopeWrapperEl) envelopeWrapperEl.focus();
        }, 300);
      }
    },

    /**
     * Mở chế độ đọc thư (Reading Mode):
     * - Đưa lá thư ra chính giữa màn hình (position: fixed; transform: translate(-50%, -50%))
     * - Phong bì lùi xuống phía sau, mờ dần và thu nhỏ
     * - Hiển thị đầy đủ nội dung, không bị che khuất
     */
    openReadingMode: function () {
      if (!letterCardEl || !envelopeWrapperEl) return;
      letterCardEl.classList.remove('is-sliding-up');
      letterCardEl.classList.add('is-reading');
      letterCardEl.classList.add('is-revealed');
      envelopeWrapperEl.classList.add('is-receded');
      if (floatingQuoteEl) {
        floatingQuoteEl.classList.add('visible');
      }
    },

    /**
     * Thu nhỏ chế độ đọc thư (đưa thư về gần phong bì nếu người dùng muốn chiêm ngưỡng phong bì/vũ trụ)
     */
    closeReadingMode: function () {
      if (!letterCardEl || !envelopeWrapperEl) return;
      letterCardEl.classList.remove('is-reading');
      envelopeWrapperEl.classList.remove('is-receded');
    },

    /**
     * Xử lý chuỗi hiệu ứng mở phong bì (Trình tự 4 bước mượt mà theo yêu cầu):
     * 1. Con dấu sáp phát sáng nhẹ và mở niêm phong
     * 2. Nắp phong thư từ từ lật lên bằng transform: rotateX(180deg)
     * 3. Lá thư trượt lên khỏi phong bì bằng animation mượt mà
     * 4. Sau khi trượt lên, lá thư chuyển tiếp đến vị trí chính giữa màn hình (chế độ đọc),
     *    phong bì thu nhỏ, mờ dần và lùi xuống phía sau
     * 5. Khi đã ổn định hoàn toàn ở giữa màn hình, hiệu ứng máy đánh chữ bắt đầu gõ lời chúc
     */
    handleOpenEnvelope: function () {
      // Chống nhấp liên tục gây lỗi animation
      if (isEnvelopeOpened || isAnimating) {
        return;
      }
      isAnimating = true;

      console.info('[LetterModule] Người dùng đã chạm vào con dấu để mở phong thư!');

      // BƯỚC 1: Con dấu sáp phát sáng nhẹ và mở niêm phong
      if (waxSealEl) {
        waxSealEl.classList.add('is-clicked');
      }

      // BƯỚC 2: Nắp phong thư từ từ lật lên bằng transform: rotateX(180deg)
      if (envelopeWrapperEl) {
        envelopeWrapperEl.classList.add('is-open');
      }

      // Sau 360ms: nắp đã lật qua góc 90 độ, gán flap-behind để nắp nằm phía sau lá thư
      // Đồng thời kích hoạt lá thư trượt lên khỏi khe phong bì
      setTimeout(() => {
        if (envelopeWrapperEl) {
          envelopeWrapperEl.classList.add('flap-behind');
        }
        if (letterCardEl) {
          letterCardEl.classList.add('is-revealed');
          letterCardEl.classList.add('is-sliding-up');
        }
      }, 360);

      // BƯỚC 3: Sau khi lá thư trượt lên khỏi phong bì (880ms), chuyển tiếp đến vị trí chính giữa màn hình (Chế độ đọc)
      // Phong bì thu nhỏ và lùi xuống phía sau để tôn vinh bức thiệp
      setTimeout(() => {
        this.openReadingMode();

        // BƯỚC 4: Sau khi lá thư đã ổn định hoàn toàn ở vị trí trung tâm (~1400ms kể từ đầu)
        // Bắt đầu hiệu ứng máy đánh chữ xuất hiện êm ái
        setTimeout(() => {
          this.startTypewriter(LETTER_CONFIG.body);
          isEnvelopeOpened = true;
          isAnimating = false;
        }, 520);
      }, 880);
    },

    /**
     * Hiệu ứng máy đánh chữ (Typewriter Effect)
     * Chạy mềm mại từng ký tự tiếng Việt có dấu và dấu xuống dòng
     * @param {string} text - Nội dung lời chúc cần gõ
     */
    startTypewriter: function (text) {
      if (!bodyTextEl) return;

      if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }

      isTyping = true;
      bodyTextEl.textContent = '';

      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
      }

      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }

      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }

      // Phân tách ký tự bằng Array.from để bảo toàn các ký tự UTF-8 tiếng Việt
      const characters = Array.from(text || LETTER_CONFIG.body);
      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex < characters.length) {
          bodyTextEl.textContent += characters[currentIndex];
          currentIndex++;

          // Nhịp gõ tự nhiên (32ms - 44ms), chậm hơn nhẹ ở dấu câu
          const char = characters[currentIndex - 1];
          let delay = LETTER_CONFIG.typingSpeed;

          if (char === '.' || char === '!' || char === '?') {
            delay += 140; // Nghỉ nhẹ sau dấu chấm câu
          } else if (char === ',' || char === '–') {
            delay += 60;
          } else if (char === '\n') {
            delay += 100;
          }

          typewriterTimeout = setTimeout(typeNextChar, delay);
        } else {
          // Hoàn thành gõ chữ: Lá thư đứng yên hoàn toàn để đọc
          isTyping = false;
          console.info('[LetterModule] Đã hoàn thành hiển thị toàn bộ nội dung bức thư chúc mừng 20/10.');

          // Con trỏ nhấp nháy thêm 1 giây rồi ẩn
          setTimeout(() => {
            if (typingCursorEl) {
              typingCursorEl.classList.add('done');
            }
          }, 1000);

          // Hiển thị phần ký tên ở cuối thư
          setTimeout(() => {
            if (signatureAreaEl) {
              signatureAreaEl.classList.add('visible');
            }
          }, 350);

          // Hiển thị nút đọc lại thư
          setTimeout(() => {
            if (actionsFooterEl) {
              actionsFooterEl.classList.add('visible');
            }
          }, 850);
        }
      };

      typeNextChar();
    },

    /**
     * Chạy lại hiệu ứng gõ chữ khi người dùng nhấn "Đọc lại thư ↺"
     * Luôn đảm bảo lá thư ở chế độ đọc chính giữa màn hình và cuộn lên đầu nếu cần
     */
    replay: function () {
      if (isTyping || isAnimating) return;
      console.info('[LetterModule] Người dùng yêu cầu đọc lại bức thư.');

      // Đưa lá thư ra giữa màn hình nếu đang không ở chế độ đọc
      this.openReadingMode();

      // Cuộn lên đầu lá thư nếu trên mobile người dùng đã cuộn xuống cuối
      if (letterCardEl) {
        letterCardEl.scrollTo({ top: 0, behavior: 'smooth' });
      }

      this.startTypewriter(LETTER_CONFIG.body);
    },

    /**
     * Khởi tạo hệ thống hạt sáng & cánh hoa bay lãng đãng quanh phong thư
     */
    initFloatingParticles: function () {
      if (!particlesContainerEl) return;
      particlesContainerEl.innerHTML = '';

      const items = [
        { type: 'heart', char: '💗' },
        { type: 'heart', char: '🌸' },
        { type: 'sparkle', char: '✨' },
        { type: 'sparkle', char: '✦' },
        { type: 'petal', char: '' },
      ];

      const TOTAL_PARTICLES = 16;
      for (let i = 0; i < TOTAL_PARTICLES; i++) {
        const itemConfig = items[i % items.length];
        const span = document.createElement('span');
        span.className = `letter-floating-item item-${itemConfig.type}`;

        if (itemConfig.type !== 'petal') {
          span.textContent = itemConfig.char;
        }

        const left = Math.floor(Math.random() * 92) + 4;
        const top = Math.floor(Math.random() * 84) + 8;
        const delay = (Math.random() * 6).toFixed(2);
        const duration = (7.5 + Math.random() * 5).toFixed(2);

        span.style.left = `${left}%`;
        span.style.top = `${top}%`;
        span.style.animationDelay = `${delay}s`;
        span.style.animationDuration = `${duration}s`;

        particlesContainerEl.appendChild(span);
      }
    },

    /**
     * Cập nhật nội dung bức thư nếu cần
     * @param {Object} options - { title, body, signature }
     */
    updateContent: function (options) {
      if (!options) return;

      if (options.title) {
        LETTER_CONFIG.title = options.title;
        const titleEl = document.querySelector('.letter-cursive-title');
        if (titleEl) titleEl.textContent = options.title;
      }

      if (options.body) {
        LETTER_CONFIG.body = options.body;
      }

      if (options.signature && signatureNameEl) {
        LETTER_CONFIG.signature = options.signature;
        signatureNameEl.textContent = options.signature;
      }
    },
  };

  // Đăng ký module vào phạm vi toàn cục để main.js liên kết mượt mà
  window.LetterModule = LetterModule;
  window.LetterAndPuzzleModule = LetterModule;
})();
