function reducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionDuration(ms: number): number {
	return reducedMotion() ? 0 : ms;
}

export function reveal(node: HTMLElement, options: { delay?: number; once?: boolean } = {}) {
	node.style.setProperty('--reveal-delay', `${options.delay ?? 0}ms`);
	node.classList.add('reveal');
	const once = options.once ?? false;
	if (typeof IntersectionObserver === 'undefined' || reducedMotion()) {
		node.classList.add('is-visible');
		return {};
	}
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					if (once) io.unobserve(entry.target);
				} else if (!once) {
					entry.target.classList.remove('is-visible');
				}
			}
		},
		{ threshold: 0.12 }
	);
	io.observe(node);
	return {
		destroy: () => io.disconnect()
	};
}
