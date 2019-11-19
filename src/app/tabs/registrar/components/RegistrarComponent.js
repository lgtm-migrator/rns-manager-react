import React from 'react';
import propTypes from 'prop-types';
import { multilanguage } from 'redux-multilanguage';
import { TabWithSearchComponent } from '../../../components';
import { RentalPeriodContainer, CommitContainer, RevealContainer } from '../containers';

const RegistrarComponent = (props) => {
  const {
    strings, domain,
  } = props;

  return (
    <div>
      <TabWithSearchComponent>
        <h2>
          {strings.start_registration_for}
          {' '}
          <code>{domain}</code>
        </h2>
        <h4>registering a name requires you to complete 3 steps</h4>
        <RentalPeriodContainer />
        <hr />
        <CommitContainer />
        <RevealContainer />
      </TabWithSearchComponent>
    </div>
  );
};

RegistrarComponent.propTypes = {
  strings: propTypes.shape({
    start_registration_for: propTypes.string.isRequired,
    rental_period: propTypes.string.isRequired,
  }).isRequired,
  domain: propTypes.string.isRequired,
};

export default multilanguage(RegistrarComponent);
