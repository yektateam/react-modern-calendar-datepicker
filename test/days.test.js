import React from 'react';
import { render, fireEvent, getByText } from '@testing-library/react';

import utils from '../src/shared/localeUtils';

import { Calendar } from '../src';
import { getDateAccordingToMonth } from '../src/shared/generalUtils';
import { Header } from '../src/components';

const { getMonthLength, getToday, getMonthFirstWeekday, getMonthName, isBeforeDate } = utils();

const renderCalendar = props => {
  const selectors = render(<Calendar {...props} />);
  const activeSection = Array.from(selectors.getByTestId('days-section-wrapper').children).find(
    child => child.classList.contains('-shown'),
  );
  const days = Array.from(activeSection.children);
  const standardDays = days.filter(day => !day.classList.contains('-blank'));
  const getDay = day => getByText(activeSection, String(day));
  return { ...selectors, activeSection, days, standardDays, getDay };
};

describe('Calendar Days', () => {
  describe('Basic Rendering', () => {
    test(`renders current month's all days`, () => {
      const currentMonthLength = getMonthLength(getToday());
      const { standardDays } = renderCalendar();

      expect(standardDays).toHaveLength(currentMonthLength);
    });

    test('displays the correct weekday for the first day of the month', () => {
      const { days } = renderCalendar();
      const weekday = getMonthFirstWeekday(getToday());
      const startingBlankDays = days.slice(0, 7).filter(day => day.classList.contains('-blank'));

      expect(startingBlankDays).toHaveLength(weekday);
    });

    test('appends blank days for additional days week', () => {
      const monthWith5Weeks = { year: 2019, month: 10, day: 5 };
      const { days } = renderCalendar({ value: monthWith5Weeks });

      expect(days.length / 7).toBeGreaterThan(5);
      expect(days.length / 7).toBeLessThan(6);
    });

    test(`shows current month and year title when there's no value`, () => {
      const date = getToday();
      const currentYear = date.year;
      const currentMonth = getMonthName(date.month);
      const { getByTestId } = renderCalendar();
      const shownMonthYear = Array.from(getByTestId('month-year-container').children).find(child =>
        child.classList.contains('-shown'),
      );
      const [monthButton, yearButton] = shownMonthYear.children;

      expect(monthButton.textContent).toBe(currentMonth);
      expect(yearButton.textContent).toBe(String(currentYear));
    });

    test(`shows date's month and year as title when it has value`, () => {
      const singleDateValue = { year: 2018, month: 2, day: 1 };
      const { getByTestId, rerender } = renderCalendar({ value: singleDateValue });
      const shownMonthYear = Array.from(getByTestId('month-year-container').children).find(child =>
        child.classList.contains('-shown'),
      );
      const [monthButton, yearButton] = shownMonthYear.children;

      expect(monthButton.textContent).toBe('February');
      expect(yearButton.textContent).toBe('2018');

      const rangeValue = {
        from: { year: 2001, month: 10, day: 27 },
        to: { year: 2001, month: 11, day: 3 },
      };
      rerender(<Calendar value={rangeValue} />);
      expect(monthButton.textContent).toBe('October');
      expect(yearButton.textContent).toBe('2001');

      const multiDateValue = [
        { year: 2000, month: 1, day: 1 },
        { year: 2001, month: 10, day: 1 },
        { year: 2015, month: 6, day: 1 },
      ];
      rerender(<Calendar value={multiDateValue} />);
      expect(monthButton.textContent).toBe('January');
      expect(yearButton.textContent).toBe('2000');
    });

    test('highlights weekends when passed shouldHighlightWeekends prop', () => {
      // Gregorian weekends
      const gregorianValue = { year: 2019, month: 10, day: 1 };
      const { getDay, rerender } = renderCalendar({
        shouldHighlightWeekends: true,
        value: gregorianValue,
      });
      const gregorianValueMonthWeekendDays = [5, 6, 12, 13, 19, 20, 26, 27];
      const areAllGregorianWeekendsHighlighted = gregorianValueMonthWeekendDays
        .map(value => getDay(value))
        .every(day => day.classList.contains('-weekend'));
      expect(areAllGregorianWeekendsHighlighted).toBe(true);

      // Persian weekends
      const persianValue = { year: 1398, month: 8, day: 1 };
      rerender(<Calendar isPersian value={persianValue} shouldHighlightWeekends />);
      const persianValueMonthWeekendDays = [3, 10, 17, 24];
      const areAllPersianWeekendsHighlighted = persianValueMonthWeekendDays
        .map(value => getDay(utils(true).getLanguageDigits(value)))
        .every(day => day.classList.contains('-weekend'));
      expect(areAllPersianWeekendsHighlighted).toBe(true);
    });
  });

  describe('Days Selection', () => {
    test('selects a single date', () => {
      const onChange = jest.fn();
      const { getDay, rerender } = renderCalendar({ onChange });
      const day = 10;
      const sampleDateButton = getDay(day);

      fireEvent.click(sampleDateButton);
      const value = { ...getToday(), day };
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(value);

      rerender(<Calendar value={value} />);
      expect(sampleDateButton).toHaveClass('-selected');
    });

    test('selects multiple dates', () => {
      const onChange = jest.fn();
      const { getDay, rerender } = renderCalendar({ value: [], onChange });

      const day1 = 1;
      const day1Button = getDay(day1);
      const valueAfterFirstClick = [{ ...getToday(), day: day1 }];
      fireEvent.click(day1Button);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(valueAfterFirstClick);
      rerender(<Calendar onChange={onChange} value={valueAfterFirstClick} />);
      expect(day1Button).toHaveClass('-selected');

      const day2 = 5;
      const day2Button = getDay(day2);
      const valueAfterSecondClick = [...valueAfterFirstClick, { ...getToday(), day: day2 }];
      fireEvent.click(day2Button);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0]).toEqual(valueAfterSecondClick);
      rerender(<Calendar onChange={onChange} value={valueAfterSecondClick} />);
      expect(day2Button).toHaveClass('-selected');

      const day3 = 12;
      const day3Button = getDay(day3);
      const valueAfterThirdClick = [...valueAfterSecondClick, { ...getToday(), day: day3 }];
      fireEvent.click(day3Button);
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange.mock.calls[2][0]).toEqual(valueAfterThirdClick);
      rerender(<Calendar onChange={onChange} value={valueAfterThirdClick} />);
      expect(day3Button).toHaveClass('-selected');
    });

    test('replaces value on new date selection', () => {
      const initialValue = { year: 2019, month: 10, day: 1 };
      const onChange = jest.fn();
      const { getDay, rerender } = renderCalendar({ value: initialValue, onChange });
      const newDay = 2;
      const newDayButton = getDay(newDay);
      const newDateValue = { year: 2019, month: 10, day: newDay };
      // single date replacement
      fireEvent.click(newDayButton);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(newDateValue);

      // day range replacement
      rerender(<Calendar onChange={onChange} value={{ from: initialValue, to: initialValue }} />);
      fireEvent.click(newDayButton);
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0]).toEqual({
        from: newDateValue,
        to: null,
      });

      // multi date toggle
      rerender(<Calendar onChange={onChange} value={[newDateValue]} />);
      fireEvent.click(newDayButton);
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange.mock.calls[2][0]).toEqual([]);
    });

    describe('Day Range Selection', () => {
      test('selects a day range', () => {
        const onChange = jest.fn();
        const { getDay, rerender } = renderCalendar({
          onChange,
          value: { from: null, to: null },
        });
        const rangeStart = 10;
        const rangeStartButton = getDay(rangeStart);

        fireEvent.click(rangeStartButton);
        const valueAfterFirstClick = {
          from: { ...getToday(), day: rangeStart },
          to: null,
        };
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toEqual(valueAfterFirstClick);
        rerender(<Calendar onChange={onChange} value={valueAfterFirstClick} />);
        expect(rangeStartButton).toHaveClass('-selectedStart');

        const rangeBetween = 11;
        const rangeBetweenButton = getDay(rangeBetween);
        const rangeEnd = 12;
        const rangeEndButton = getDay(rangeEnd);
        fireEvent.click(rangeEndButton);
        const valueAfterSecondClick = {
          from: { ...getToday(), day: rangeStart },
          to: { ...getToday(), day: rangeEnd },
        };
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange.mock.calls[1][0]).toEqual(valueAfterSecondClick);
        rerender(<Calendar onChange={onChange} value={valueAfterSecondClick} />);
        expect(rangeEndButton).toHaveClass('-selectedEnd');
        expect(rangeBetweenButton).toHaveClass('-selectedBetween');
      });

      test('swaps from and to when to is before from', () => {
        const onChange = jest.fn();
        const rangeStart = 12;
        const rangeEnd = 10;
        const valueAfterFirstClick = {
          from: { ...getToday(), day: rangeStart },
          to: null,
        };
        const { getDay, rerender } = renderCalendar({
          value: valueAfterFirstClick,
          onChange,
        });
        const rangeStartButton = getDay(rangeStart);
        const rangeEndButton = getDay(rangeEnd);

        const valueAfterSwap = {
          from: { ...getToday(), day: rangeEnd },
          to: { ...getToday(), day: rangeStart },
        };
        fireEvent.click(rangeEndButton);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toEqual(valueAfterSwap);
        rerender(<Calendar value={valueAfterSwap} />);
        expect(rangeStartButton).toHaveClass('-selectedEnd');
        expect(rangeEndButton).toHaveClass('-selectedStart');
      });

      test('selects the same date as range start and range end', () => {
        const onChange = jest.fn();
        const rangeStartEnd = 10;
        const valueAfterFirstClick = { ...getToday(), day: rangeStartEnd };
        const { getDay, rerender } = renderCalendar({
          value: { from: valueAfterFirstClick, to: null },
          onChange,
        });
        const rangeButton = getDay(rangeStartEnd);
        fireEvent.click(rangeButton);
        const valueAfterSecondClick = {
          from: { ...getToday(), day: rangeStartEnd },
          to: { ...getToday(), day: rangeStartEnd },
        };
        expect(onChange.mock.calls[0][0]).toEqual(valueAfterSecondClick);
        rerender(<Calendar value={valueAfterSecondClick} />);
        expect(rangeButton).toHaveClass('-selectedStart');
        expect(rangeButton).toHaveClass('-selectedEnd');
      });
    });
  });

  describe('Disabled Days', () => {
    test('disables specified days', () => {
      const onChange = jest.fn();
      const value = { year: 2019, month: 10, day: 1 };
      const disabledDays = [{ year: 2019, month: 10, day: 2 }, { year: 2019, month: 10, day: 5 }];
      const { getDay } = renderCalendar({ value, disabledDays, onChange });

      fireEvent.click(getDay(2));
      expect(onChange).toHaveBeenCalledTimes(0);
      expect(getDay(2)).toHaveClass('-disabled');
      expect(getDay(5)).toHaveClass('-disabled');
    });

    test('calls onDisabledDayError prop when selecting a single disabled day', () => {
      const value = { year: 2019, month: 10, day: 22 };
      const disabledDays = [{ year: 2019, month: 10, day: 10 }];
      const onDisabledDayError = jest.fn();

      const { getDay } = renderCalendar({ value, disabledDays, onDisabledDayError });
      fireEvent.click(getDay(disabledDays[0].day));

      expect(onDisabledDayError).toHaveBeenCalledTimes(1);
      expect(onDisabledDayError.mock.calls[0][0]).toEqual(disabledDays[0]);
    });

    test('calls onDisabledDayError prop when including a disabled day in range', () => {
      const value = { from: { year: 2019, month: 10, day: 9 }, to: null };
      const disabledDays = [{ year: 2019, month: 10, day: 10 }];
      const onDisabledDayError = jest.fn();

      const { getDay } = renderCalendar({ value, disabledDays, onDisabledDayError });
      fireEvent.click(getDay(12)); // disabled day is between 9 and 12

      expect(onDisabledDayError).toHaveBeenCalledTimes(1);
      expect(onDisabledDayError.mock.calls[0][0]).toEqual(disabledDays[0]);
    });
  });

  describe('Month Changes by Arrows', () => {
    test('changes month on arrow click', () => {
      const { getByLabelText, getByTestId, standardDays } = renderCalendar();
      const nextArrow = getByLabelText(/next month/i);
      const previousArrow = getByLabelText(/previous month/i);
      const findHiddenSliderItem = parentTestId =>
        Array.from(getByTestId(parentTestId).children).find(
          child => !child.classList.contains('-shown'),
        );
      const today = getToday();
      const currentMonthLength = getMonthLength(today);
      const nextMonthDate = getDateAccordingToMonth(today, 'NEXT');
      const nextMonthLength = getMonthLength(nextMonthDate);
      const [nextMonthButton, nextYearButton] = findHiddenSliderItem(
        'month-year-container',
      ).children;
      const hiddenNextMonthDaysSection = findHiddenSliderItem('days-section-wrapper');

      // next month arrow click
      fireEvent.click(nextArrow);
      const hiddenNextMonthDays = Array.from(hiddenNextMonthDaysSection.children).filter(
        day => !day.classList.contains('-blank'),
      );

      expect(nextYearButton.textContent).toBe(String(nextMonthDate.year));
      expect(nextMonthButton.textContent).toBe(getMonthName(nextMonthDate.month));
      expect(hiddenNextMonthDays).toHaveLength(nextMonthLength);

      // previous month arrow click
      const [previousMonthButton, previousYearButton] = findHiddenSliderItem(
        'month-year-container',
      ).children;
      fireEvent.click(previousArrow);
      const hiddenPreviousMonthDays = standardDays.filter(day => !day.classList.contains('-blank'));

      expect(previousYearButton.textContent).toBe(String(today.year));
      expect(previousMonthButton.textContent).toBe(getMonthName(today.month));
      expect(hiddenPreviousMonthDays).toHaveLength(currentMonthLength);
    });

    test('avoids parallel clicks on a month arrow button', () => {
      const mockedMonthChange = jest.fn();
      const activeDate = getToday();
      const { getByLabelText, rerender } = render(
        <Header activeDate={activeDate} onMonthChange={mockedMonthChange} />,
      );
      const nextArrow = getByLabelText(/next month/i);

      fireEvent.click(nextArrow);

      rerender(
        <Header
          activeDate={activeDate}
          monthChangeDirection="NEXT"
          onMonthChange={mockedMonthChange}
        />,
      );

      fireEvent.click(nextArrow);

      expect(mockedMonthChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Minimum & Maximum Dates', () => {
    test('disables days before minimum date and after maximum date', () => {
      const minimumDate = { year: 2019, month: 10, day: 22 };
      const maximumDate = { year: 2019, month: 10, day: 27 };
      const { standardDays } = renderCalendar({ minimumDate, value: minimumDate, maximumDate });
      const areAllDisabled = list => list.every(day => day.classList.contains('-disabled'));
      const daysBeforeMinimum = standardDays.filter(day =>
        isBeforeDate(
          {
            year: 2019,
            month: 10,
            day: Number(day.textContent),
          },
          minimumDate,
        ),
      );
      const daysAfterMaximum = standardDays.filter(day =>
        isBeforeDate(maximumDate, {
          year: 2019,
          month: 10,
          day: Number(day.textContent),
        }),
      );
      expect(areAllDisabled(daysBeforeMinimum)).toBe(true);
      expect(areAllDisabled(daysAfterMaximum)).toBe(true);
    });

    test('disables the related month arrow', () => {
      const { getByLabelText, getByTestId, rerender } = renderCalendar({
        maximumDate: { year: 2019, month: 12, day: 10 },
        value: { year: 2019, month: 10, day: 20 },
      });

      const sections = Array.from(getByTestId('days-section-wrapper').children);
      const monthYearItems = Array.from(getByTestId('month-year-container').children);

      const nextArrow = getByLabelText(/next month/i);
      const previousArrow = getByLabelText(/previous month/i);

      const endSlideAnimation = () => {
        const findAnimatedChild = child => child.classList.contains('-shownAnimated');
        const animatingMonthYearItem = monthYearItems.find(findAnimatedChild);
        const animatingSectionItem = sections.find(findAnimatedChild);
        fireEvent.animationEnd(animatingMonthYearItem);
        fireEvent.animationEnd(animatingSectionItem);
      };

      const changeMonth = arrow => {
        fireEvent.click(arrow);
        endSlideAnimation();
      };

      // next arrow basic
      expect(nextArrow).not.toHaveAttribute('disabled');
      expect(previousArrow).not.toHaveAttribute('disabled');

      changeMonth(nextArrow);
      expect(nextArrow).not.toHaveAttribute('disabled');

      changeMonth(nextArrow);
      expect(nextArrow).toHaveAttribute('disabled');

      // previous arrow basic
      rerender(
        <Calendar
          value={{ year: 2019, month: 12, day: 10 }}
          minimumDate={{ year: 2019, month: 10, day: 5 }}
        />,
      );
      changeMonth(previousArrow);
      expect(previousArrow).not.toHaveAttribute('disabled');

      changeMonth(previousArrow);
      expect(previousArrow).toHaveAttribute('disabled');
    });
  });
});
