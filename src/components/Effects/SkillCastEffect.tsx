const PARTICLES = Array.from({ length: 8 }, (_, index) => index);

const SkillCastEffect = () => {
  return (
    <div className="skill-cast-effect" aria-hidden="true">
      <div className="skill-cast-aura" />
      <div className="skill-cast-ring skill-cast-ring--outer" />
      <div className="skill-cast-ring skill-cast-ring--inner" />
      <div className="skill-cast-core" />
      <div className="skill-cast-glyph skill-cast-glyph--a" />
      <div className="skill-cast-glyph skill-cast-glyph--b" />
      <div className="skill-cast-particles">
        {PARTICLES.map((particle) => (
          <i key={particle} className={`skill-cast-particle skill-cast-particle--${particle + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default SkillCastEffect;
