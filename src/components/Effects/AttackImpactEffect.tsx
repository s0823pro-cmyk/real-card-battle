interface AttackImpactItem {
  id: number;
  x: number;
  y: number;
}

interface Props {
  impacts: AttackImpactItem[];
}

const SPARKS = Array.from({ length: 10 }, (_, index) => index);

const AttackImpactEffect = ({ impacts }: Props) => {
  return (
    <>
      {impacts.map((impact) => (
        <div
          key={impact.id}
          className="attack-impact-effect"
          style={{ left: impact.x, top: impact.y }}
          aria-hidden="true"
        >
          <div className="attack-impact-flash" />
          <div className="attack-impact-ring attack-impact-ring--outer" />
          <div className="attack-impact-ring attack-impact-ring--inner" />
          <div className="attack-impact-slash attack-impact-slash--main" />
          <div className="attack-impact-slash attack-impact-slash--sub" />
          <div className="attack-impact-core" />
          <div className="attack-impact-sparks">
            {SPARKS.map((spark) => (
              <i key={spark} className={`attack-impact-spark attack-impact-spark--${spark + 1}`} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default AttackImpactEffect;
