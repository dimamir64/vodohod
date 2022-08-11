

	
$(function(){

    
	$(window).scroll(function(){
        var top_scroll = window.pageYOffset || document.documentElement.scrollTop;
        if ( top_scroll > $('#scroll-buy-start').offset().top )	{
			$('#scroll-buy').addClass('fixed');
		}
		else {
			$('#scroll-buy').removeClass('fixed');
		}
       
        if ( top_scroll + $(window).height() > $('#scroll-buy-end').offset().top )	{
			$('#scroll-buy').addClass('show');
		}
		else {
			$('#scroll-buy').removeClass('show');
		}

    });

    /**************************************************************
	ПОПАПЫ
	**************************************************************/
	function openModal(popup_n) {
		$('.popup').fadeOut(800);
		
		let popup = $('.popup[data-popup="'+popup_n+'"]');
        $(popup).fadeIn(800); 
		$('body, html').addClass('noscroll');
	}
	function closeModal() {
		$('.popup').fadeOut(500);
		$('body, html').removeClass('noscroll');
	}

	$('body').on('click', '[data-open-popup]', function(e){
        e.preventDefault();
        
        openModal( $(this).attr('data-open-popup') );
	})		
	$('.popup-close').click(function(e){
		e.preventDefault();

		closeModal();
	})


	/**************************************************************
	accord
	**************************************************************/
	$(".accord").on("click", function (e) {
		e.preventDefault();
		
		$(this).toggleClass('opened');
		$(this).find('.accord-body').slideToggle();
	});


   	/**************************************************************
	Карусель скидок
	**************************************************************/
	$(".p_sale-carousel").each(function () {
		var courses_carousel = new Swiper(this, {
			slidesPerView: 4,
			spaceBetween: 20,
			// loop: true,
			speed: 600,
			// autoplay: {
			//     delay: 0,
			//     disableOnInteraction: false
			// },
			navigation: {
				nextEl: $(this).parents('.p_sale').find(".swiper-button-next")[0],
				prevEl: $(this).parents('.p_sale').find(".swiper-button-prev")[0],
			},
			breakpoints: {
				0: {
					slidesPerView: 2,
					spaceBetween: 10
				},
				480: {
					slidesPerView: 2,
					spaceBetween: 10
				},
				768: {
					slidesPerView: 2.6
				},
				1280: {
					slidesPerView: 4,
					spaceBetween: 20
				}
			}
		});
	})	

});


