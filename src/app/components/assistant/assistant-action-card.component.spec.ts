import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { AssistantActionCardComponent, formatRemaining } from './assistant-action-card.component';
import type { PendingActionView } from '../../services/assistant.service';

describe('formatRemaining', () => {
  it('formats m:ss and never goes below zero', () => {
    expect(formatRemaining(600_000)).toBe('10:00');
    expect(formatRemaining(61_000)).toBe('1:01');
    expect(formatRemaining(900)).toBe('0:01');
    expect(formatRemaining(-5000)).toBe('0:00');
  });
});

describe('AssistantActionCardComponent', () => {
  let fixture: ComponentFixture<AssistantActionCardComponent>;
  let el: HTMLElement;

  const action = (over: Partial<PendingActionView> = {}): PendingActionView => ({
    id: 'a1',
    type: 'add_to_cart',
    summary: 'Agregar 2 kg de Tomate (Bs 25.00)',
    expiresAt: new Date(Date.now() + 90_000).toISOString(),
    state: 'pending',
    ...over,
  });

  function render(a: PendingActionView) {
    fixture = TestBed.createComponent(AssistantActionCardComponent);
    fixture.componentInstance.action = a;
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [AssistantActionCardComponent] }));

  it('pending: summary, countdown and both buttons that emit the action id', () => {
    render(action());
    const confirm = jasmine.createSpy('confirm');
    const reject = jasmine.createSpy('reject');
    fixture.componentInstance.confirm.subscribe(confirm);
    fixture.componentInstance.reject.subscribe(reject);

    expect(el.textContent).toContain('Agregar 2 kg de Tomate');
    expect(el.querySelector('#assistant-action-timer-a1')!.textContent).toMatch(/Vence en 1:(29|30)/);
    (el.querySelector('#assistant-confirm-a1') as HTMLButtonElement).click();
    (el.querySelector('#assistant-reject-a1') as HTMLButtonElement).click();
    expect(confirm).toHaveBeenCalledOnceWith('a1');
    expect(reject).toHaveBeenCalledOnceWith('a1');
  });

  it('confirming: both buttons are disabled', () => {
    render(action({ state: 'confirming' }));
    expect((el.querySelector('#assistant-confirm-a1') as HTMLButtonElement).disabled).toBeTrue();
    expect((el.querySelector('#assistant-reject-a1') as HTMLButtonElement).disabled).toBeTrue();
    expect(el.textContent).toContain('Confirmando');
  });

  const finals: [PendingActionView['state'], string | undefined, string][] = [
    ['confirmed', undefined, 'Confirmada'],
    ['rejected', undefined, 'Rechazada'],
    ['expired', 'Esta propuesta venció.', 'Esta propuesta venció.'],
    ['failed', 'No hay suficiente stock', 'No hay suficiente stock'],
  ];
  for (const [state, error, text] of finals) {
    it(`${state}: shows "${text}" and no buttons`, () => {
      render(action({ state, error }));
      expect(el.querySelector('#assistant-action-status-a1')!.textContent).toContain(text);
      expect(el.querySelector('button')).toBeNull();
    });
  }

  it('emits expired once the countdown reaches zero', fakeAsync(() => {
    render(action({ expiresAt: new Date(Date.now() + 2_000).toISOString() }));
    const expired = jasmine.createSpy('expired');
    fixture.componentInstance.expired.subscribe(expired);

    tick(1000);
    expect(expired).not.toHaveBeenCalled();
    tick(2000);
    expect(expired).toHaveBeenCalledWith('a1');
    fixture.destroy();
    discardPeriodicTasks();
  }));
});
